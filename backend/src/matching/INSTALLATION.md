# Matching System Dependencies

Add these dependencies to your `backend/package.json`:

```json
{
  "dependencies": {
    "h3-js": "^4.1.0",
    "ioredis": "^5.3.2",
    "@nestjs/bullmq": "^10.0.1",
    "bullmq": "^5.0.0",
    "@nestjs/event-emitter": "^2.0.4",
    "class-validator": "^0.14.0",
    "class-transformer": "^0.5.1"
  },
  "devDependencies": {
    "@types/ioredis": "^5.0.0"
  }
}
```

## Installation

```bash
cd backend
npm install h3-js ioredis @nestjs/bullmq bullmq @nestjs/event-emitter
npm install -D @types/ioredis
```

## Environment Variables

Add to your `.env` file:

```bash
# Redis Configuration
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=
REDIS_DB=0
REDIS_QUEUE_DB=1

# H3 Geospatial
H3_RESOLUTION=8
MAX_SEARCH_RINGS=5
MAX_SEARCH_RADIUS_KM=10

# Matching Configuration
PENDING_ASSIGNMENT_TTL=90
DRIVER_INACTIVITY_THRESHOLD=120
INACTIVITY_CHECK_INTERVAL=30

# Pricing (in your currency - NGN)
BASE_FARE=500
PER_KM_RATE=150
PER_MIN_RATE=20
PLATFORM_FEE_PERCENT=0.15
DELIVERY_BASE_FEE=300
DELIVERY_PER_KM_RATE=100
DELIVERY_PER_KG_RATE=50

# Queue Concurrency
RIDE_MATCHING_CONCURRENCY=10
DELIVERY_MATCHING_CONCURRENCY=10
NOTIFICATION_CONCURRENCY=20
INACTIVITY_CONCURRENCY=1
```

## Docker Setup (Optional)

If using Docker, add Redis to your `docker-compose.yml`:

```yaml
services:
  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    volumes:
      - redis-data:/data
    command: redis-server --appendonly yes
    networks:
      - app-network

volumes:
  redis-data:

networks:
  app-network:
```

## Start Redis

### Local Development

```bash
# macOS (via Homebrew)
brew install redis
brew services start redis

# Ubuntu/Debian
sudo apt-get install redis-server
sudo systemctl start redis

# Windows (via WSL or download from Redis website)
```

### Docker

```bash
docker-compose up redis -d
```

## Verify Redis Connection

```bash
# Test connection
redis-cli ping
# Should respond: PONG

# Check if empty
redis-cli DBSIZE
# Should respond: (integer) 0
```

## Module Integration

Add `MatchingModule` to your main `AppModule`:

```typescript
// backend/src/app.module.ts
import { Module } from '@nestjs/common';
import { MatchingModule } from './matching/matching.module';

@Module({
  imports: [
    // ... your existing modules
    MatchingModule,
  ],
})
export class AppModule {}
```

## Run the Application

```bash
cd backend
npm run start:dev
```

You should see:

```
✅ Redis connected
✅ Queue service initialized
✅ Recurring jobs configured
```

## Test the System

### 1. Set a driver online

```bash
curl -X POST http://localhost:3000/api/drivers/online \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <driver-token>" \
  -d '{"lat": 9.0765, "lng": 7.3986}'
```

### 2. Request a ride

```bash
curl -X POST http://localhost:3000/api/rides/request \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <customer-token>" \
  -d '{
    "pickupAddressId": "uuid-1",
    "dropoffAddressId": "uuid-2"
  }'
```

### 3. Check Redis state

```bash
# Check driver status
redis-cli GET driver:<driver-id>:status

# Check hex index
redis-cli SMEMBERS hex:88283082edfffff:drivers

# Check queue
redis-cli LLEN bull:ride-matching:wait
```
