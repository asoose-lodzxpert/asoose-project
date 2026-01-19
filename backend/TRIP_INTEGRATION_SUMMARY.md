# Trip Request & Matching Integration - Summary

## What Was Done

Successfully integrated the ride-hailing and delivery matching system with your existing backend payment flow. Here's what was created:

### 1. **Trip Request System** (`backend/src/users/trips/`)

#### Files Created:

- **`dto/trip.dto.ts`** - Request validation DTOs
  - `RequestRideDto` - Pickup and dropoff addresses
  - `RequestDeliveryDto` - Order ID, addresses, recipient details, package info
  - `CancelTripDto` - Cancellation reason

- **`trips.service.ts`** - Business logic (486 lines)
  - `requestRide()` - Create ride with PENDING status, calculate fare
  - `startRideMatching()` - Called after payment success, changes status to REQUESTED, triggers matching
  - `requestDelivery()` - Create delivery with PENDING status, calculate fee
  - `startDeliveryMatching()` - Called after payment success, triggers rider matching
  - `cancelRide()`, `cancelDelivery()` - Handle cancellations
  - `getUserRides()`, `getUserDeliveries()` - List user's trips

- **`trips.controller.ts`** - Customer-facing API endpoints
  - `POST /trips/rides/request` - Request a new ride
  - `GET /trips/rides` - List user's rides (optional status filter)
  - `GET /trips/rides/:id` - Get specific ride details
  - `PATCH /trips/rides/:id/cancel` - Cancel a ride
  - `POST /trips/deliveries/request` - Request a new delivery
  - `GET /trips/deliveries` - List user's deliveries
  - `GET /trips/deliveries/:id` - Get delivery details
  - `PATCH /trips/deliveries/:id/cancel` - Cancel delivery

- **`trips.module.ts`** - Module configuration
  - Imports: PrismaModule, MatchingModule, PaymentModule (with forwardRef)
  - Exports: TripsService (for use by PaymentService)

### 2. **Payment Webhook Integration** (`backend/src/payment/`)

#### Modified Files:

- **`payment.service.ts`**
  - Added `TripsService` injection with `forwardRef` to avoid circular dependencies
  - Modified `updatePaymentStatus()` to:
    - Include `delivery` relation when fetching order payment
    - Include `ride` relation when fetching ride payment
    - Call `startDeliveryMatching()` when order payment succeeds and has delivery
    - Call `startRideMatching()` when ride payment succeeds
  - Added `startRideMatching()` method - triggers ride matching after payment
  - Added `startDeliveryMatching()` method - triggers delivery matching after payment

- **`payment.module.ts`**
  - Added `forwardRef(() => TripsModule)` to imports to enable circular dependency resolution

### 3. **Database Schema Updates** (`backend/prisma/schema.prisma`)

#### Modified Enums:

```prisma
enum RideStatus {
  PENDING      // ✅ NEW - Payment not yet confirmed
  REQUESTED    // Payment confirmed, searching for driver
  ACCEPTED     // Driver accepted
  IN_PROGRESS  // Trip started
  COMPLETED    // Trip completed
  CANCELLED    // Trip cancelled
}

enum DeliveryStatus {
  PENDING      // ✅ NEW - Payment not yet confirmed
  REQUESTED    // Payment confirmed, searching for rider
  ASSIGNED     // Rider assigned
  PICKED_UP    // Package picked up
  DELIVERED    // Package delivered
  CANCELLED    // Delivery cancelled
}
```

### 4. **Module Integration**

#### Updated Files:

- **`backend/src/users/users.module.ts`**
  - Added `TripsModule` to imports

- **`backend/src/app.module.ts`** (already done)
  - Added `MatchingModule` to imports

- **`backend/docker-compose.yml`** (already done)
  - Added Redis service with persistence and health checks

---

## How the Flow Works

### **Ride Request Flow:**

1. **Customer requests a ride**

   ```
   POST /trips/rides/request
   {
     "pickupAddressId": "uuid",
     "dropoffAddressId": "uuid"
   }
   ```

2. **System creates ride with PENDING status**
   - Validates addresses belong to user
   - Calculates distance using H3 geospatial
   - Calculates fare breakdown (base + distance + time + platform fee)
   - Generates 4-digit start OTP
   - Returns ride details with fare breakdown

3. **Customer pays for the ride**
   - Payment service creates payment record linked to `rideId`
   - Payment gateway redirects customer to payment page

4. **Payment webhook receives success notification**
   - `payment.service.ts` → `updatePaymentStatus()`
   - Updates payment status to SUCCESS
   - Calls `startRideMatching(rideId)`

5. **Matching system activates**
   - TripsService updates ride status from PENDING → REQUESTED
   - Emits `ride.requested` event
   - Enqueues ride-matching job in BullMQ
   - RideMatchingProcessor picks up job
   - Searches hexes in expanding rings (0-5)
   - Finds closest available driver
   - Atomically locks driver
   - Sends notification to driver
   - Driver accepts → status changes to ACCEPTED

6. **Trip lifecycle continues**
   - Driver arrives → Customer verifies OTP → status: IN_PROGRESS
   - Driver completes trip → status: COMPLETED
   - Either party cancels → status: CANCELLED

### **Delivery Request Flow:**

1. **Customer requests delivery**

   ```
   POST /trips/deliveries/request
   {
     "orderId": "uuid",  // optional
     "pickupAddressId": "uuid",
     "dropoffAddressId": "uuid",
     "recipientName": "John Doe",
     "recipientPhone": "+234...",
     "packageDetails": "2 bags of rice",
     "weightKg": 50
   }
   ```

2. **System creates delivery with PENDING status**
   - Calculates delivery fee based on distance and weight
   - Generates 4-digit delivery OTP

3. **Customer pays (or order payment succeeds)**
   - For marketplace orders: payment linked to `orderId`
   - For standalone delivery: payment linked to `deliveryId`

4. **Payment webhook triggers matching**
   - If order has delivery: `startDeliveryMatching(deliveryId)`
   - Updates status from PENDING → REQUESTED
   - Emits `delivery.requested` event
   - Enqueues delivery-matching job

5. **Rider matching and delivery**
   - DeliveryMatchingProcessor finds closest rider
   - Rider picks up package → PICKED_UP
   - Rider delivers → recipient verifies OTP → DELIVERED

---

## Required Setup Steps

### **1. Generate Prisma Types**

```bash
cd backend
npx prisma generate
```

This updates TypeScript types to include new PENDING status values.

### **2. Run Database Migration**

```bash
npx prisma migrate dev --name add-pending-status-to-rides-and-deliveries
```

This adds PENDING to RideStatus and DeliveryStatus enums in PostgreSQL.

### **3. Start Redis** (if not already running)

```bash
docker-compose up -d redis
```

### **4. Restart Backend**

```bash
# Stop current backend
# Then restart with:
npm run start:dev
```

---

## API Usage Examples

### **Request a Ride**

```bash
curl -X POST http://localhost:3000/trips/rides/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddressId": "address-uuid-1",
    "dropoffAddressId": "address-uuid-2"
  }'
```

**Response:**

```json
{
  "ride": {
    "id": "ride-uuid",
    "status": "PENDING",
    "distanceKm": 5.2,
    "durationMin": 11,
    "totalFare": 1500,
    "startOtp": "4829",
    "pickupAddress": {...},
    "dropoffAddress": {...}
  },
  "fareBreakdown": {
    "baseFare": 500,
    "distanceFare": 780,
    "timeFare": 220,
    "platformFee": 225,
    "driverFee": 1275,
    "totalFare": 1500
  },
  "message": "Ride created. Complete payment to request a driver."
}
```

### **Request a Delivery**

```bash
curl -X POST http://localhost:3000/trips/deliveries/request \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "pickupAddressId": "store-address-uuid",
    "dropoffAddressId": "customer-address-uuid",
    "recipientName": "Jane Smith",
    "recipientPhone": "+2348012345678",
    "packageDetails": "Electronics - Handle with care",
    "weightKg": 2
  }'
```

### **Get User's Rides**

```bash
# All rides
curl http://localhost:3000/trips/rides \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"

# Filter by status
curl http://localhost:3000/trips/rides?status=REQUESTED \
  -H "Authorization: Bearer YOUR_JWT_TOKEN"
```

### **Cancel a Ride**

```bash
curl -X PATCH http://localhost:3000/trips/rides/:rideId/cancel \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "reason": "Found alternative transportation"
  }'
```

---

## Files Modified Summary

| File                                     | Changes                                                                        |
| ---------------------------------------- | ------------------------------------------------------------------------------ |
| `backend/prisma/schema.prisma`           | Added PENDING to RideStatus and DeliveryStatus enums                           |
| `backend/src/payment/payment.service.ts` | Added TripsService injection, modified updatePaymentStatus to trigger matching |
| `backend/src/payment/payment.module.ts`  | Added forwardRef to TripsModule                                                |
| `backend/src/users/users.module.ts`      | Added TripsModule import                                                       |
| `backend/src/app.module.ts`              | ✅ Already has MatchingModule                                                  |
| `backend/docker-compose.yml`             | ✅ Already has Redis service                                                   |

## Files Created Summary

| File                                          | Lines | Purpose                 |
| --------------------------------------------- | ----- | ----------------------- |
| `backend/src/users/trips/dto/trip.dto.ts`     | 45    | Request validation DTOs |
| `backend/src/users/trips/trips.service.ts`    | 486   | Trip business logic     |
| `backend/src/users/trips/trips.controller.ts` | 103   | Customer API endpoints  |
| `backend/src/users/trips/trips.module.ts`     | 18    | Module configuration    |

**Total:** 652 lines of new code + 4 files modified

---

## Testing Checklist

- [ ] Run `npx prisma generate` to update types
- [ ] Run `npx prisma migrate dev` to update database
- [ ] Start Redis: `docker-compose up -d redis`
- [ ] Restart backend: `npm run start:dev`
- [ ] Test ride request endpoint: `POST /trips/rides/request`
- [ ] Test delivery request endpoint: `POST /trips/deliveries/request`
- [ ] Verify rides/deliveries created with PENDING status
- [ ] Make test payment via payment gateway
- [ ] Verify payment webhook triggers matching (check logs)
- [ ] Verify ride/delivery status changes to REQUESTED
- [ ] Check BullMQ dashboard for matching jobs
- [ ] Verify driver/rider matching works end-to-end

---

## Next Steps (Optional Enhancements)

1. **Add ride payment initialization endpoint**
   - Currently rides are created but payment flow needs to be triggered
   - Add `POST /trips/rides/:id/pay` to generate payment link

2. **Add WebSocket real-time updates**
   - Notify customer when driver is found
   - Send location updates during trip
   - Notify on status changes

3. **Add trip history pagination**
   - Current endpoints return all trips
   - Add pagination with `page` and `limit` query params

4. **Add estimated arrival time (ETA)**
   - Calculate ETA when driver accepts
   - Update ETA in real-time as driver moves

5. **Add surge pricing**
   - Dynamic fare multiplier based on demand
   - Store surge data in Redis

6. **Add driver ratings**
   - Allow customers to rate drivers after trip
   - Update driver's average rating

---

## Architecture Diagram

```
Customer Request Flow:
┌─────────────┐
│  Customer   │
└──────┬──────┘
       │ POST /trips/rides/request
       ▼
┌─────────────────┐
│ TripsController │
└──────┬──────────┘
       │
       ▼
┌──────────────┐     Create Ride      ┌──────────┐
│ TripsService ├──────status:PENDING──►│ Database │
└──────────────┘                       └──────────┘
       │
       │ Return ride + payment link
       ▼
┌─────────────┐
│  Customer   │ Makes payment
└──────┬──────┘
       │
       ▼
┌─────────────────┐
│ Payment Gateway │ Webhook notification
└──────┬──────────┘
       │
       ▼
┌────────────────┐     Update status    ┌──────────┐
│ PaymentService ├───────SUCCESS────────►│ Database │
└────────┬───────┘                       └──────────┘
         │
         │ startRideMatching()
         ▼
┌──────────────┐
│ TripsService │ Update status: PENDING→REQUESTED
└──────┬───────┘
       │
       │ Emit event & enqueue job
       ▼
┌────────────────────┐
│  Matching System   │
│  - EventBusService │
│  - QueueService    │
│  - Redis State     │
└────────┬───────────┘
         │
         ▼
┌──────────────────────┐
│ RideMatchingProcessor│ Search hexes, find driver
└────────┬─────────────┘
         │
         │ Driver found & locked
         ▼
┌─────────────────┐
│ Notify Driver   │ Push notification
└─────────────────┘
```

---

## Troubleshooting

### **TypeScript errors about PENDING status**

→ Run `npx prisma generate` to regenerate types

### **Database errors about PENDING status**

→ Run `npx prisma migrate dev` to update database schema

### **TripsService not found error in payment webhook**

→ Make sure TripsModule is imported in PaymentModule with forwardRef

### **Circular dependency errors**

→ Both PaymentModule and TripsModule use forwardRef - this is intentional and correct

### **Redis connection errors**

→ Make sure Redis is running: `docker-compose up -d redis`

### **Matching not triggered after payment**

→ Check logs for "Started ride matching for ride..." message
→ Verify payment has `rideId` or order has `delivery` relation

---

## Configuration

### **Fare Calculation** (in `geo.service.ts`):

```typescript
BASE_FARE = ₦500
PER_KM_RATE = ₦150
PER_MIN_RATE = ₦20
PLATFORM_FEE_PERCENT = 15%
```

### **Delivery Fee Calculation**:

```typescript
BASE_FEE = ₦300
PER_KM_RATE = ₦100
PER_KG_RATE = ₦50
```

### **Matching Configuration**:

```typescript
H3_RESOLUTION = 8 (~0.74 km² hexes)
MAX_RINGS = 5 (expand search up to 5 hex rings)
MAX_SEARCH_RADIUS_KM = 10
```

These can be moved to environment variables for easier configuration.
