# Quick Start Guide - Trip Request Integration

## ✅ What's Ready

Your matching system is now fully integrated with your backend! Here's what works:

### Customer Flow

1. Customer requests ride → Status: **PENDING** (awaiting payment)
2. Customer pays → Payment webhook fires → Status: **REQUESTED** (matching starts)
3. Driver found → Status: **ACCEPTED**
4. Trip starts → Status: **IN_PROGRESS**
5. Trip ends → Status: **COMPLETED**

### Delivery Flow

1. Customer requests delivery → Status: **PENDING**
2. Customer pays (or order payment succeeds) → Status: **REQUESTED** (matching starts)
3. Rider assigned → Status: **ASSIGNED**
4. Package picked up → Status: **PICKED_UP**
5. Package delivered → Status: **DELIVERED**

---

## 🚀 Setup Commands

### 1. Database Migration (Required)

```bash
cd backend
npx prisma migrate dev --name add_pending_status_to_rides_and_deliveries
```

### 2. Start Services

```bash
# Redis is on Railway - no need to start locally
# Just make sure your .env has the Railway Redis credentials:
# REDIS_HOST=your-railway-redis-host
# REDIS_PORT=your-railway-redis-port
# REDIS_PASSWORD=your-railway-redis-password
# REDIS_DB=0
# MATCHING_REDIS_DB=1  (separate DB for matching system)

# Start backend
npm run start:dev
```

---

## 📡 API Endpoints

### Ride Requests

**POST /trips/rides/request**

```json
{
  "pickupAddressId": "uuid",
  "dropoffAddressId": "uuid"
}
```

→ Creates ride with PENDING status, returns fare breakdown

**GET /trips/rides**
→ List user's rides (query: `?status=REQUESTED`)

**GET /trips/rides/:id**
→ Get ride details

**PATCH /trips/rides/:id/cancel**

```json
{
  "reason": "Changed plans"
}
```

→ Cancel ride

### Delivery Requests

**POST /trips/deliveries/request**

```json
{
  "orderId": "uuid", // optional
  "pickupAddressId": "uuid",
  "dropoffAddressId": "uuid",
  "recipientName": "John Doe",
  "recipientPhone": "+234...",
  "packageDetails": "Electronics",
  "weightKg": 2
}
```

→ Creates delivery with PENDING status

**GET /trips/deliveries**
→ List user's deliveries

**GET /trips/deliveries/:id**
→ Get delivery details

**PATCH /trips/deliveries/:id/cancel**
→ Cancel delivery

---

## 🔄 How Payment Integration Works

### Automatic Trigger

When payment webhook receives success:

```typescript
// payment.service.ts - updatePaymentStatus()

// For ride payments
if (payment.rideId && status === SUCCESS) {
  → startRideMatching(rideId)
    → Update status: PENDING → REQUESTED
    → Emit ride.requested event
    → Enqueue matching job
    → Worker finds driver
    → Notify driver
}

// For delivery payments (via order)
if (payment.order?.delivery && status === SUCCESS) {
  → startDeliveryMatching(deliveryId)
    → Update status: PENDING → REQUESTED
    → Enqueue delivery-matching job
    → Worker finds rider
}
```

---

## 🧪 Testing Checklist

- [ ] Add `MATCHING_REDIS_DB=1` to your `.env` file
- [ ] Verify Railway Redis credentials in `.env` (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
- [ ] Run migration: `npx prisma migrate dev`
- [ ] Restart backend: `npm run start:dev`
- [ ] Check logs for "Redis connected for Matching System (DB: 1)"
- [ ] Create test addresses for user
- [ ] Request ride via POST /trips/rides/request
- [ ] Verify ride created with PENDING status
- [ ] Make payment for the ride
- [ ] Check logs for "Started ride matching for ride..."
- [ ] Verify status changes to REQUESTED
- [ ] Check Redis DB 1 for driver search activity (matching system data)
- [ ] Test delivery flow similarly

---

## 📁 New Files Created

```
backend/src/users/trips/
├── dto/
│   └── trip.dto.ts              # Request validation
├── trips.service.ts             # Business logic (486 lines)
├── trips.controller.ts          # API endpoints
└── trips.module.ts              # Module config

backend/
├── TRIP_INTEGRATION_SUMMARY.md  # Full documentation
└── QUICK_START.md               # This file
```

---

## 🔧 Configuration

### Pricing (in geo.service.ts)

```typescript
Ride Fare:
- Base: ₦500
- Per km: ₦150
- Per minute: ₦20
- Platform fee: 15%

Delivery Fee:
- Base: ₦300
- Per km: ₦100
- Per kg: ₦50
```

### Matching

```typescript
- H3 Resolution: 8 (~0.74 km² hexes)
- Max search rings: 5
- Max radius: 10 km
```

---

## 🐛 Troubleshooting

**TypeScript errors about PENDING?**
→ Run `npx prisma generate`

**Database migration fails?**
→ Check database connection in `.env`
→ Make sure PostgreSQL is running on Railway

**Matching doesn't trigger after payment?**
→ Check backend logs for errors
→ Verify Railway Redis credentials in `.env`
→ Check logs for "Redis connected for Matching System (DB: 1)"
→ Check payment has `rideId` or order has `delivery`

**Can't connect to Redis?**
→ Verify Railway Redis credentials (REDIS_HOST, REDIS_PORT, REDIS_PASSWORD)
→ Make sure MATCHING_REDIS_DB=1 is set in `.env`
→ Check Railway Redis service is running

**Can't connect to database?**
→ Your database is on Railway - make sure you have internet connection
→ Check `.env` has correct DATABASE_URL

---

## 📊 Status Flow Diagram

```
Ride Status:
PENDING → REQUESTED → ACCEPTED → IN_PROGRESS → COMPLETED
   ↓          ↓           ↓            ↓
CANCELLED  CANCELLED   CANCELLED    CANCELLED

Delivery Status:
PENDING → REQUESTED → ASSIGNED → PICKED_UP → DELIVERED
   ↓          ↓          ↓           ↓
CANCELLED  CANCELLED  CANCELLED   CANCELLED
```

---

## 🎯 Next Steps

1. **Run the migration** (most important!)

   ```bash
   cd backend
   npx prisma migrate dev
   ```

2. **Test the flow end-to-end**
   - Create ride request
   - Make payment
   - Verify matching triggers

3. **Optional enhancements** (see TRIP_INTEGRATION_SUMMARY.md)
   - Add ride payment endpoint
   - Add WebSocket for real-time updates
   - Add pagination
   - Add ETA calculations
   - Add surge pricing

---

## 📞 Payment Flow Example

```bash
# 1. Customer requests ride
curl -X POST http://localhost:3000/trips/rides/request \
  -H "Authorization: Bearer TOKEN" \
  -d '{"pickupAddressId":"uuid1", "dropoffAddressId":"uuid2"}'

# Response includes:
# - rideId
# - totalFare: 1500
# - status: "PENDING"

# 2. Initialize payment (your existing payment flow)
curl -X POST http://localhost:3000/payment/initiate \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "amount": 1500,
    "rideId": "ride-uuid",
    "gateway": "PAYSTACK"
  }'

# 3. Customer pays via payment gateway
# 4. Webhook fires → matching starts automatically
# 5. Check ride status
curl http://localhost:3000/trips/rides/ride-uuid \
  -H "Authorization: Bearer TOKEN"

# Status should be "REQUESTED" and driver matching in progress!
```

---

**Ready to go! 🚀**

Just run the migration and you're all set. The entire matching system will activate automatically when payments succeed.
