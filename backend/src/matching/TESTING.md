# Testing Guide

## Quick Test Scenarios

### Scenario 1: Basic Ride Matching

**Goal**: Test end-to-end ride matching flow

```bash
# Terminal 1: Start Redis
redis-server

# Terminal 2: Start application
npm run start:dev

# Terminal 3: Monitor Redis
redis-cli MONITOR

# Terminal 4: Run tests
```

**Step 1: Set driver online**

```bash
curl -X POST http://localhost:3000/api/drivers/online \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <driver-jwt>" \
  -d '{
    "lat": 9.0765,
    "lng": 7.3986
  }'
```

**Expected Redis Operations:**

```
SET driver:<driver-id>:status "ONLINE"
SET driver:<driver-id>:hex "88283082edfffff"
SET driver:<driver-id>:lastSeen "1705500000000"
SET driver:<driver-id>:location '{"lat":9.0765,"lng":7.3986}'
SADD hex:88283082edfffff:drivers <driver-id>
INCR hex:88283082edfffff:count
```

**Step 2: Request a ride**

```bash
curl -X POST http://localhost:3000/api/rides/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer-jwt>" \
  -d '{
    "pickupAddressId": "<address-uuid-1>",
    "dropoffAddressId": "<address-uuid-2>"
  }'
```

**Expected Flow:**

1. Ride created in DB with status=REQUESTED
2. Event emitted: `ride.requested`
3. Job enqueued to `ride-matching` queue
4. Worker processes job within 1-2 seconds
5. Driver receives push notification

**Step 3: Driver accepts**

```bash
curl -X POST http://localhost:3000/api/drivers/accept \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <driver-jwt>" \
  -d '{
    "tripType": "ride",
    "tripId": "<ride-uuid>"
  }'
```

**Expected Redis Operations:**

```
GET driver:<driver-id>:pendingRide
SET driver:<driver-id>:status "ACTIVE"
SET driver:<driver-id>:currentRide "<ride-id>"
DEL driver:<driver-id>:pendingRide
DEL lock:ride:<ride-id>:driver:<driver-id>
```

---

### Scenario 2: Assignment Timeout

**Goal**: Test automatic retry when driver doesn't respond

**Steps:**

1. Set driver online
2. Request ride
3. Wait 90 seconds (don't accept/decline)
4. Observe automatic decline and retry

**Expected Behavior:**

- After 90s, timeout job executes
- Driver's pending assignment is cleared
- Driver is re-added to hex index (if still ONLINE)
- New matching job is enqueued
- Next closest driver is notified

**Verification:**

```bash
# Check timeout job
redis-cli KEYS "bull:assignment-timeout:*"

# Check driver state after timeout
redis-cli GET driver:<driver-id>:status
# Should be "ONLINE" again

# Check declined list
redis-cli SMEMBERS matching:ride:<ride-id>:declined
# Should contain first driver ID
```

---

### Scenario 3: Multiple Drivers in Hex

**Goal**: Test driver selection by distance

**Setup:**

```bash
# Set 3 drivers online in same area
curl -X POST http://localhost:3000/api/drivers/online \
  -H "Authorization: Bearer <driver1-jwt>" \
  -d '{"lat": 9.0765, "lng": 7.3986}'

curl -X POST http://localhost:3000/api/drivers/online \
  -H "Authorization: Bearer <driver2-jwt>" \
  -d '{"lat": 9.0775, "lng": 7.3990}'  # Slightly farther

curl -X POST http://localhost:3000/api/drivers/online \
  -H "Authorization: Bearer <driver3-jwt>" \
  -d '{"lat": 9.0790, "lng": 7.4000}'  # Farthest
```

**Test:**

```bash
# Request ride at pickup: 9.0760, 7.3985
curl -X POST http://localhost:3000/api/rides/request ...
```

**Expected:**

- Closest driver (driver1) receives notification first
- If driver1 declines/times out, driver2 gets notified
- If driver2 declines/times out, driver3 gets notified

**Verification:**

```bash
# Check assignment order in logs
grep "Locked driver" logs/matching.log
```

---

### Scenario 4: Driver Inactivity

**Goal**: Test automatic offline marking for inactive drivers

**Steps:**

1. Set driver online
2. Stop sending location updates (no heartbeat)
3. Wait 2.5 minutes
4. Check driver status

**Expected Timeline:**

- **t=0s**: Driver goes online
- **t=120s**: Inactivity monitor detects (lastSeen > 2min)
- **t=120s**: Event emitted: `driver.ping.inactive`
- **t=150s**: Still no heartbeat
- **t=150s**: Driver marked OFFLINE
- **t=150s**: Removed from hex index

**Verification:**

```bash
# After 2.5 minutes
redis-cli GET driver:<driver-id>:status
# Should be "OFFLINE"

redis-cli SMEMBERS hex:88283082edfffff:drivers
# Should NOT contain driver ID
```

---

### Scenario 5: Hex Ring Expansion

**Goal**: Test matching expands to outer rings when no driver nearby

**Setup:**

```bash
# Set driver online in a far hex (different from pickup)
# Pickup at: 9.0765, 7.3986 (hex: 88283082edfffff)
# Driver at: 9.0900, 7.4200 (hex: different, ~2km away)

curl -X POST http://localhost:3000/api/drivers/online \
  -H "Authorization: Bearer <driver-jwt>" \
  -d '{"lat": 9.0900, "lng": 7.4200}'
```

**Test:**

```bash
# Request ride at original location
curl -X POST http://localhost:3000/api/rides/request \
  -d '{"pickupAddressId": "<nearby-address>"}'
```

**Expected:**

- Worker searches ring 0 (center hex) - no drivers
- Expands to ring 1 (7 hexes) - no drivers
- Expands to ring 2 (19 hexes) - finds driver!
- Driver receives notification

**Verification:**

```bash
# Check logs for ring expansion
grep "Searching ring" logs/matching.log
# Should show:
# Searching ring 0 (1 hexes)
# Searching ring 1 (6 hexes)
# Searching ring 2 (12 hexes)
# Locked driver...
```

---

### Scenario 6: Concurrent Matching (Race Condition Test)

**Goal**: Ensure driver cannot be assigned to multiple rides

**Setup:**

```bash
# Set 1 driver online
curl -X POST http://localhost:3000/api/drivers/online ...

# Request 5 rides simultaneously from different customers
for i in {1..5}; do
  curl -X POST http://localhost:3000/api/rides/request ... &
done
wait
```

**Expected:**

- Only 1 ride gets the driver
- Other 4 rides continue searching
- No double assignment (atomic Lua script prevents this)

**Verification:**

```bash
# Check driver state
redis-cli GET driver:<driver-id>:pendingRide
# Should have only 1 ride ID

# Check locks
redis-cli KEYS "lock:ride:*:driver:<driver-id>"
# Should have only 1 lock

# Check other rides
redis-cli KEYS "lock:ride:*"
# Should NOT have locks for other rides with this driver
```

---

## Unit Tests

```typescript
// matching/driver-state/driver-state.service.spec.ts

describe('DriverStateService', () => {
  let service: DriverStateService;
  let redis: RedisService;

  beforeEach(async () => {
    const module = await Test.createTestingModule({
      providers: [
        DriverStateService,
        RedisService,
        GeoService,
        EventBusService,
      ],
    }).compile();

    service = module.get<DriverStateService>(DriverStateService);
    redis = module.get<RedisService>(RedisService);
  });

  it('should set driver online', async () => {
    const driverId = 'test-driver-1';
    await service.setOnline(driverId, 9.0765, 7.3986);

    const status = await redis.getDriverStatus(driverId);
    expect(status).toBe('ONLINE');
  });

  it('should update location and change hex', async () => {
    const driverId = 'test-driver-1';
    await service.setOnline(driverId, 9.0765, 7.3986);

    const oldState = await redis.getDriverState(driverId);
    await service.updateLocation(driverId, 9.09, 7.42);
    const newState = await redis.getDriverState(driverId);

    expect(newState.hexId).not.toBe(oldState.hexId);
  });

  it('should accept trip and go ACTIVE', async () => {
    const driverId = 'test-driver-1';
    const rideId = 'test-ride-1';

    await service.setOnline(driverId, 9.0765, 7.3986);
    // Simulate pending assignment
    await redis.setPendingAssignment(driverId, 'ride', rideId);

    await service.acceptTrip(driverId, TripType.RIDE, rideId);

    const status = await redis.getDriverStatus(driverId);
    expect(status).toBe('ACTIVE');
  });
});
```

---

## Load Testing

```bash
# Install k6
brew install k6  # macOS
# or download from https://k6.io/

# Create load test script
cat > load-test.js << 'EOF'
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '30s', target: 50 },   // Ramp up to 50 users
    { duration: '1m', target: 50 },    // Stay at 50 users
    { duration: '30s', target: 100 },  // Ramp up to 100 users
    { duration: '1m', target: 100 },   // Stay at 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
};

export default function () {
  // Request ride
  const payload = JSON.stringify({
    pickupAddressId: '550e8400-e29b-41d4-a716-446655440000',
    dropoffAddressId: '550e8400-e29b-41d4-a716-446655440001',
  });

  const params = {
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Bearer test-token',
    },
  };

  const res = http.post('http://localhost:3000/api/rides/request', payload, params);

  check(res, {
    'status is 201': (r) => r.status === 201,
    'response has rideId': (r) => JSON.parse(r.body).id !== undefined,
  });

  sleep(1);
}
EOF

# Run load test
k6 run load-test.js
```

**Expected Results:**

- p95 response time < 200ms
- 0% error rate
- Queue processes all jobs
- No memory leaks

---

## Redis Monitoring Commands

```bash
# Monitor all Redis commands
redis-cli MONITOR

# Check memory usage
redis-cli INFO memory

# Check connected clients
redis-cli CLIENT LIST

# Check slow queries
redis-cli SLOWLOG GET 10

# Check key statistics
redis-cli --bigkeys

# Check specific patterns
redis-cli KEYS "driver:*:status"
redis-cli KEYS "hex:*:drivers"
redis-cli KEYS "lock:*"

# Get driver count per hex
for hex in $(redis-cli KEYS "hex:*:count"); do
  echo "$hex: $(redis-cli GET $hex)"
done

# Count online drivers
redis-cli EVAL "return redis.call('KEYS', 'driver:*:status')" 0 | \
  xargs -I {} redis-cli GET {} | grep -c "ONLINE"
```

---

## Queue Monitoring

```bash
# Check queue sizes
redis-cli LLEN bull:ride-matching:wait
redis-cli LLEN bull:ride-matching:active
redis-cli LLEN bull:ride-matching:completed
redis-cli LLEN bull:ride-matching:failed

# Check delayed jobs
redis-cli ZCARD bull:ride-matching:delayed

# Check job details
redis-cli HGETALL bull:ride-matching:1

# Pause queue
redis-cli SET bull:ride-matching:paused 1

# Resume queue
redis-cli DEL bull:ride-matching:paused
```

---

## Debugging Tips

### Issue: Driver not receiving assignment

**Checklist:**

```bash
# 1. Check driver is online
redis-cli GET driver:<id>:status

# 2. Check driver in hex index
redis-cli SMEMBERS hex:<hexId>:drivers

# 3. Check driver has no pending/active trips
redis-cli GET driver:<id>:pendingRide
redis-cli GET driver:<id>:currentRide

# 4. Check matching job processed
redis-cli LLEN bull:ride-matching:failed

# 5. Check logs
tail -f logs/matching.log | grep <driver-id>
```

### Issue: Assignment timeout not working

**Checklist:**

```bash
# 1. Check timeout job scheduled
redis-cli ZRANGE bull:assignment-timeout:delayed 0 -1 WITHSCORES

# 2. Check timeout worker running
ps aux | grep "assignment-timeout"

# 3. Check job TTL
redis-cli TTL driver:<id>:pendingRide
```

### Issue: Hex index out of sync

**Fix:**

```bash
# Rebuild hex index (admin command)
curl -X POST http://localhost:3000/api/admin/rebuild-hex-index
```

---

## Performance Benchmarks

### Target Metrics

| Metric                     | Target       | Acceptable  |
| -------------------------- | ------------ | ----------- |
| API response time (p95)    | < 100ms      | < 200ms     |
| Matching time (p95)        | < 2s         | < 5s        |
| Location update processing | < 10ms       | < 50ms      |
| Queue throughput           | > 100 jobs/s | > 50 jobs/s |
| Redis memory per driver    | < 5KB        | < 10KB      |
| Driver state query         | < 1ms        | < 5ms       |

### Benchmark Script

```bash
# Benchmark location updates
ab -n 10000 -c 100 -T application/json \
  -H "Authorization: Bearer test-token" \
  -p location.json \
  http://localhost:3000/api/drivers/location

# location.json
{"lat": 9.0765, "lng": 7.3986}
```

---

**Happy Testing! 🧪**
