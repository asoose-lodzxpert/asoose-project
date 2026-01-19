# 🚕 Production-Grade Ride-Hailing & Delivery Matching System

A horizontally scalable, event-driven matching system using **Redis**, **H3 Geospatial Indexing**, **BullMQ**, and **NestJS**.

## 🎯 Core Principles

### ✅ Hard Rules

1. **Redis is the Single Source of Truth for Real-Time State**
   - Driver status (OFFLINE | ONLINE | ACTIVE)
   - Driver location & hex index
   - Current/pending trip assignments
   - NO driver state in database

2. **All Matching Happens in Queue Workers**
   - API handlers ONLY create trip records & emit events
   - Matching algorithms run asynchronously in workers
   - Horizontally scalable (add more workers as needed)

3. **Atomic Operations via Lua Scripts**
   - All state transitions are race-condition-free
   - Driver cannot be assigned to multiple trips
   - Hex index updates are atomic

4. **Event-Driven Architecture**
   - All state changes emit events
   - Decoupled services (notifications, analytics, audit)
   - Replay-able for debugging

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        CLIENT APPS                          │
│         (Customer App, Driver App, Vendor App)              │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP/WebSocket
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                     NESTJS API SERVER                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐            │
│  │  Ride API  │  │ Driver API │  │Delivery API│            │
│  └─────┬──────┘  └─────┬──────┘  └─────┬──────┘            │
│        │                │                │                   │
│        └────────────────┼────────────────┘                   │
│                         │                                    │
│                         ▼                                    │
│              ┌─────────────────────┐                        │
│              │   EVENT BUS         │                        │
│              └─────────┬───────────┘                        │
│                        │                                    │
│        ┌───────────────┼───────────────┐                   │
│        │               │               │                   │
│        ▼               ▼               ▼                   │
│  ┌─────────┐   ┌─────────────┐  ┌──────────┐             │
│  │ DB Save │   │ Queue Enqueue│  │ Webhooks │             │
│  └─────────┘   └──────┬──────┘  └──────────┘             │
└────────────────────────┼───────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                      REDIS CLUSTER                          │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │  DRIVER STATE   │  │   HEX INDEX     │                 │
│  │  driver:*       │  │   hex:*         │                 │
│  │  status/location│  │   SADD/SREM     │                 │
│  └─────────────────┘  └─────────────────┘                 │
│  ┌─────────────────────────────────────┐                  │
│  │        BULLMQ QUEUES                │                  │
│  │  - ride-matching                    │                  │
│  │  - delivery-matching                │                  │
│  │  - driver-inactivity                │                  │
│  │  - notification                     │                  │
│  │  - assignment-timeout               │                  │
│  └─────────────────────────────────────┘                  │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Job Consumption
               ▼
┌─────────────────────────────────────────────────────────────┐
│                    QUEUE WORKERS                            │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ Ride Matching   │  │Delivery Matching│                 │
│  │ Worker (x10)    │  │ Worker (x10)    │                 │
│  └─────────────────┘  └─────────────────┘                 │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ Inactivity      │  │ Timeout Handler │                 │
│  │ Monitor (x1)    │  │ Worker (x5)     │                 │
│  └─────────────────┘  └─────────────────┘                 │
│                                                             │
│         │                                                   │
│         ▼                                                   │
│  ┌─────────────────┐                                       │
│  │ H3 HEX EXPANSION│                                       │
│  │ Ring 0 → Ring 5 │                                       │
│  │ Distance Sort   │                                       │
│  │ Atomic Lock     │                                       │
│  └─────────────────┘                                       │
└──────────────┬──────────────────────────────────────────────┘
               │
               │ Event Emit
               ▼
┌─────────────────────────────────────────────────────────────┐
│               EVENT CONSUMERS                               │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ Notification    │  │  Analytics      │                 │
│  │ Service         │  │  Service        │                 │
│  │ (Expo Push)     │  │  (Logging)      │                 │
│  └─────────────────┘  └─────────────────┘                 │
└─────────────────────────────────────────────────────────────┘
```

---

## 📍 H3 Geospatial Indexing

### Why H3?

- **O(1) proximity lookup** - No expensive distance calculations
- **Hex-based coverage** - Better than grid squares
- **Multi-resolution** - Zoom levels for different scales
- **Uber-proven** - Battle-tested at scale

### Resolution Levels

| Level | Avg Area      | Avg Edge     | Use Case                       |
| ----- | ------------- | ------------ | ------------------------------ |
| 7     | ~5.16 km²     | ~1.22 km     | City-wide coverage             |
| **8** | **~0.74 km²** | **~0.46 km** | **Neighborhood (RECOMMENDED)** |
| 9     | ~0.10 km²     | ~0.17 km     | Precise matching               |

We use **Resolution 8** for optimal balance.

### Hex Ring Expansion

```
Ring 0: 1 hex (center)
Ring 1: 7 hexes total (center + 6 neighbors)
Ring 2: 19 hexes total
Ring 3: 37 hexes total
Ring 4: 61 hexes total
Ring 5: 91 hexes total
```

Matching searches expand rings until driver found or max distance reached.

---

## 🔴 Redis Schema

### Driver State Keys

```redis
# Status: OFFLINE | ONLINE | ACTIVE
driver:{id}:status = "ONLINE"

# Current hex ID
driver:{id}:hex = "88283082edfffff"

# Last heartbeat timestamp
driver:{id}:lastSeen = 1705500000000

# Active trips
driver:{id}:currentRide = "ride-uuid"
driver:{id}:currentDelivery = "delivery-uuid"

# Pending assignments (TTL 90s)
driver:{id}:pendingRide = "ride-uuid" EX 90
driver:{id}:pendingDelivery = "delivery-uuid" EX 90

# Location (GeoJSON)
driver:{id}:location = '{"lat":9.0765,"lng":7.3986}'
```

### Hex Index (Geospatial)

```redis
# Set of available driver IDs in hex
# ONLY contains drivers that are:
# - status = ONLINE
# - no pending assignments
# - no active trips
hex:{hexId}:drivers = SADD driver-id-1 driver-id-2

# Driver count (for monitoring)
hex:{hexId}:count = 5
```

### Assignment Locks (Prevent Race Conditions)

```redis
# Prevent double assignment
lock:ride:{rideId}:driver:{driverId} = "1" EX 90
lock:delivery:{deliveryId}:driver:{driverId} = "1" EX 90

# Global trip lock (prevent concurrent matching)
lock:ride:{rideId} = "1" EX 90
lock:delivery:{deliveryId} = "1" EX 90
```

### Matching Metadata

```redis
# Track matching attempts
matching:ride:{rideId}:attempts = 3 EX 3600

# Declined drivers list
matching:ride:{rideId}:declined = SADD driver-id-1 driver-id-2 EX 3600
```

---

## 🧠 Matching Algorithm

### Step-by-Step Flow

#### 1. **Customer Requests Ride**

```typescript
POST /api/rides/request
{
  "pickupAddressId": "uuid",
  "dropoffAddressId": "uuid"
}
```

**API Handler:**

1. Create `Ride` record in DB with status = `REQUESTED`
2. Calculate distance & fare
3. Emit event: `ride.requested`
4. Enqueue job to `ride-matching` queue
5. Return ride ID to customer

#### 2. **Matching Worker Processes Job**

```typescript
// Pseudo-code
async function matchRide(job: MatchRideJob) {
  // Lock trip to prevent concurrent matching
  await redis.setTripLock('ride', rideId);

  // Get pickup hex
  const pickupHex = h3.latLngToCell(pickupLat, pickupLng, 8);

  // Expand in rings
  for (let ring = 0; ring <= 5; ring++) {
    const hexes = h3.gridDisk(pickupHex, ring);

    for (const hex of hexes) {
      // Get available drivers in hex
      const drivers = await redis.smembers(`hex:${hex}:drivers`);

      // Filter & sort by distance
      const sorted = sortByDistance(pickupLat, pickupLng, drivers);

      for (const driver of sorted) {
        // Atomically try to lock driver
        const locked = await atomicLockDriver(driver.id, rideId, hex);

        if (locked) {
          // Success! Notify driver
          await emitAssignmentRequested(driver.id, rideId);
          await scheduleTimeout(driver.id, rideId, 90_000);
          return;
        }
      }
    }
  }

  // No driver found
  await handleNoDriverFound(rideId);
}
```

#### 3. **Atomic Driver Lock (Lua Script)**

```lua
-- ATOMIC_LOCK_DRIVER
local status = redis.call('GET', 'driver:' .. driverId .. ':status')

-- Check availability
if status != 'ONLINE' then return 0 end
if redis.call('EXISTS', 'driver:' .. driverId .. ':pendingRide') then return 0 end
if redis.call('EXISTS', 'driver:' .. driverId .. ':currentRide') then return 0 end

-- All checks passed - LOCK ATOMICALLY
redis.call('SETEX', 'driver:' .. driverId .. ':pendingRide', 90, rideId)
redis.call('SETEX', 'lock:ride:' .. rideId .. ':driver:' .. driverId, 90, '1')
redis.call('SREM', 'hex:' .. hexId .. ':drivers', driverId)

return 1
```

#### 4. **Driver Responds (Accept or Decline)**

**Accept:**

```typescript
POST /api/drivers/accept
{
  "tripType": "ride",
  "tripId": "ride-uuid"
}
```

**Atomic Accept (Lua):**

```lua
-- Verify pending assignment
local pending = redis.call('GET', 'driver:' .. driverId .. ':pendingRide')
if pending != rideId then return 0 end

-- Set ACTIVE
redis.call('SET', 'driver:' .. driverId .. ':status', 'ACTIVE')
redis.call('SET', 'driver:' .. driverId .. ':currentRide', rideId)
redis.call('DEL', 'driver:' .. driverId .. ':pendingRide')
redis.call('DEL', 'lock:ride:' .. rideId .. ':driver:' .. driverId)

return 1
```

**Decline:**

```typescript
POST /api/drivers/decline
{
  "tripType": "ride",
  "tripId": "ride-uuid",
  "reason": "Too far"
}
```

**Atomic Decline (Lua):**

```lua
-- Clear pending
redis.call('DEL', 'driver:' .. driverId .. ':pendingRide')
redis.call('DEL', 'lock:ride:' .. rideId .. ':driver:' .. driverId)

-- Add to declined list
redis.call('SADD', 'matching:ride:' .. rideId .. ':declined', driverId)
redis.call('EXPIRE', 'matching:ride:' .. rideId .. ':declined', 3600)

-- Re-add to hex (if still ONLINE)
if status == 'ONLINE' then
  redis.call('SADD', 'hex:' .. hexId .. ':drivers', driverId)
end

return 1
```

**Then:** Matching worker retries with next driver.

#### 5. **Timeout After 90s**

If no response, `assignment-timeout` job executes:

- Calls atomic decline script
- Re-enqueues matching job with excluded driver

---

## ⏱️ Driver Inactivity Monitor

**Runs every 30 seconds:**

```typescript
async function checkInactivity() {
  const now = Date.now();
  const threshold = 120_000; // 2 minutes

  // Find drivers with lastSeen > 2 min ago
  const inactive = await findInactiveDrivers(threshold);

  for (const driver of inactive) {
    // First detection - emit ping event
    if (!lastCheck.has(driver.id)) {
      emit('driver.ping.inactive', { driverId: driver.id });
      lastCheck.set(driver.id, now);
    }
    // Still inactive after 30s grace period
    else if (now - lastCheck.get(driver.id) > 30_000) {
      // Set driver OFFLINE
      await atomicSetOffline(driver.id);
      emit('driver.marked.inactive', { driverId: driver.id });
    }
  }
}
```

---

## 📡 Event Flow

### Ride Request → Assignment

```
Customer → API: Request Ride
          ↓
       DB: Save Ride (status=REQUESTED)
          ↓
    Event: ride.requested
          ↓
    Queue: ride-matching job
          ↓
   Worker: Search hexes for driver
          ↓
    Redis: Atomic lock driver
          ↓
    Event: ride.assignment.requested
          ↓
Notif Svc: Send Expo push to driver
          ↓
   Driver: Accept/Decline
          ↓
    Redis: Atomic accept/decline
          ↓
    Event: ride.accepted / ride.declined
          ↓
       DB: Update Ride status
```

---

## 🔐 Concurrency & Safety

### Race Condition Prevention

1. **Atomic Lua Scripts**
   - All state transitions are atomic
   - No driver can be assigned to 2 trips
   - Hex index updates are consistent

2. **Global Trip Locks**
   - Only one worker can match a trip at a time
   - Prevents duplicate assignments

3. **Idempotent Operations**
   - Location updates are safe to retry
   - Accept/decline can be called multiple times safely

4. **TTL-based Cleanup**
   - Stale locks expire automatically
   - Pending assignments timeout after 90s

### Failure Scenarios

| Scenario                     | Handling                                |
| ---------------------------- | --------------------------------------- |
| Worker crashes mid-match     | Job retries automatically (BullMQ)      |
| Driver accepts after timeout | Atomic script rejects (pending cleared) |
| Redis reconnect              | State preserved, workers resume         |
| Duplicate location update    | Idempotent, last write wins             |

---

## 🚀 Deployment & Scaling

### Horizontal Scaling

```yaml
# docker-compose.yml
services:
  api:
    replicas: 3 # Scale API servers

  ride-worker:
    replicas: 10 # 10 concurrent ride matching workers

  delivery-worker:
    replicas: 10

  inactivity-worker:
    replicas: 1 # Single worker to prevent duplicates
```

### Redis Configuration

```bash
# Production: Use Redis Cluster
REDIS_HOST=redis-cluster-proxy
REDIS_PORT=6379
REDIS_PASSWORD=strong-password
REDIS_DB=0  # Driver state
REDIS_QUEUE_DB=1  # BullMQ queues
```

### Environment Variables

```bash
# Geo
H3_RESOLUTION=8
MAX_SEARCH_RINGS=5
MAX_SEARCH_RADIUS_KM=10

# Matching
PENDING_ASSIGNMENT_TTL=90
DRIVER_INACTIVITY_THRESHOLD=120
INACTIVITY_CHECK_INTERVAL=30

# Pricing
BASE_FARE=500
PER_KM_RATE=150
PER_MIN_RATE=20
PLATFORM_FEE_PERCENT=0.15
```

---

## 📊 Monitoring

### Key Metrics

- **Redis:**
  - Active drivers count per hex
  - Pending assignments count
  - Average last seen time

- **Queues:**
  - Waiting jobs count
  - Processing time (p50, p95, p99)
  - Failed jobs count

- **Matching:**
  - Time to first driver assignment
  - No driver found rate
  - Decline rate per driver

### Health Checks

```typescript
GET /health/matching
{
  "redis": "connected",
  "queues": {
    "ride-matching": { "waiting": 5, "active": 3 },
    "delivery-matching": { "waiting": 2, "active": 1 }
  },
  "drivers": {
    "online": 150,
    "active": 45
  }
}
```

---

## 🧪 Testing

### Unit Tests

```bash
npm run test:matching
```

### Integration Tests

```bash
npm run test:matching:e2e
```

### Load Testing

```bash
# Simulate 1000 concurrent ride requests
npm run test:load:rides
```

---

## 📚 API Documentation

Full API docs available at:

```
http://localhost:3000/api/docs
```

---

## 🎓 Key Takeaways

1. **Redis = Real-Time State** - Never query DB for driver location/status
2. **Queue Workers = Scalable Matching** - Add more workers to handle load
3. **H3 Hexes = Fast Proximity** - O(1) lookup instead of expensive distance calculations
4. **Lua Scripts = Atomic Safety** - No race conditions, guaranteed consistency
5. **Events = Decoupled Services** - Notifications, analytics, audit all subscribe to events

---

## 🛠️ Dependencies

```json
{
  "h3-js": "^4.1.0",
  "ioredis": "^5.3.2",
  "@nestjs/bullmq": "^10.0.1",
  "bullmq": "^5.0.0",
  "@nestjs/event-emitter": "^2.0.4"
}
```

---

## 📄 License

MIT

---

**Built with ❤️ for production-grade ride-hailing systems**
