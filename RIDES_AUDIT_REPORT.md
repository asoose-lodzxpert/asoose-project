# Rides Page MVP Audit Report

**Date**: February 24, 2026  
**Scope**: Customer Web App — Rides Page (frontend + backend integration)  
**Verdict**: ❌ NOT MVP-Ready (pre-fix) → ✅ MVP-Ready (post-fix)

---

## Executive Summary

A full audit was conducted on the Rides page of the customer web app, covering:

- Frontend: `apps/customer-web-app/src/app/main/ride/`
- Backend: `backend/src/users/trips/rides.service.ts` and `trips.controller.ts`
- Supporting: fare service, socket listener, Zustand store, ride mapper, sync hook

**4 blocking bugs** were found and fixed. **5 non-blocking risks** were identified and documented for follow-up.

---

## Files Audited

| File | Role |
|------|------|
| `backend/src/users/trips/rides.service.ts` | Core ride lifecycle (request, confirm, start, complete, cancel) |
| `backend/src/users/trips/trips.controller.ts` | REST API endpoints |
| `backend/src/users/trips/rides-cleanup.service.ts` | Cron-based stuck ride recovery |
| `backend/src/fare/fare.service.ts` | Fare calculation |
| `backend/src/fare/fare.controller.ts` | Fare endpoint |
| `web/.../services/ride.service.ts` | Frontend API client |
| `web/.../store/ride.ts` | Zustand global state |
| `web/.../hooks/useRideSynchronization.ts` | Polling + state reconciliation |
| `web/.../components/RideSocketListener.tsx` | Real-time socket events |
| `web/.../components/RideController.tsx` | Route-based UI state switcher |
| `web/.../components/RideSelection.tsx` | Booking form + ride request flow |
| `web/.../components/DriverArrived.tsx` | Driver on-way / arrived screen |
| `web/.../components/TripInProgress.tsx` | Active trip screen |
| `web/.../components/RatingModal.tsx` | Post-trip rating |
| `web/.../services/mappers/ride.mapper.ts` | Backend → ViewModel transformation |
| `web/.../services/validate-create-ride-payload.ts` | Client-side payload guard |

---

## Blocking Bugs Fixed

---

### 🔴 BUG 1 — `startRide` permanently rejected after driver marked Arrived

**Severity**: Critical — Trip can never start once driver marks arrival  
**File**: `backend/src/users/trips/rides.service.ts`

#### Root Cause

The ride lifecycle has two status transitions before a trip starts:

```
ACCEPTED → (driver arrives) → ARRIVED → (OTP verified) → IN_PROGRESS
```

`driverArrived()` correctly transitions `ACCEPTED → ARRIVED`. However `startRide()` then enforced:

```typescript
// BEFORE (broken)
if (ride.status !== RideStatus.ACCEPTED)
  throw new BadRequestException('Ride not ready to start');
```

Once the ride was in `ARRIVED` state, this check permanently rejected the OTP verification call, making it **impossible for any trip to ever start after the driver arrived**.

#### Fix

```typescript
// AFTER (fixed)
if (ride.status !== RideStatus.ACCEPTED && ride.status !== RideStatus.ARRIVED)
  throw new BadRequestException('Ride not ready to start');
```

---

### 🔴 BUG 2 — `getCurrentRide` excluded `ARRIVED` — UI reset to idle on driver arrival

**Severity**: Critical — Customer's screen snaps back to booking form while driver is waiting at pickup  
**File**: `backend/src/users/trips/rides.service.ts`

#### Root Cause

`getCurrentRide` queried for rides with statuses `[PENDING, REQUESTED, ACCEPTED, IN_PROGRESS]`. The `ARRIVED` status was missing. When `useRideSynchronization` polled every 15 seconds and received `null`, it interpreted this as "no active ride" and reset the entire Zustand store to `idle`, navigating the customer back to the booking form.

```typescript
// BEFORE (broken) — ARRIVED not included
status: {
  in: [
    RideStatus.PENDING,
    RideStatus.REQUESTED,
    RideStatus.ACCEPTED,
    RideStatus.IN_PROGRESS,
  ],
},
```

#### Fix

```typescript
// AFTER (fixed)
status: {
  in: [
    RideStatus.PENDING,
    RideStatus.REQUESTED,
    RideStatus.ACCEPTED,
    RideStatus.ARRIVED,   // ← added
    RideStatus.IN_PROGRESS,
  ],
},
```

---

### 🔴 BUG 3 — OTP system was entirely broken — customer never saw their trip code

**Severity**: Critical — Core security handshake between customer and driver was non-functional  
**Files**: `rides.service.ts`, `useRideSynchronization.ts`, `store/ride.ts`, `DriverArrived.tsx`, `RideSelection.tsx`, `ride.mapper.ts`

#### Root Cause

The OTP system had three compounding failures:

1. **Irreversible hash**: The OTP was hashed with bcrypt (`bcrypt.hash(rawOtp, 10)`) before storing. bcrypt is one-way — there is no way to retrieve the original OTP after storage. This is appropriate for passwords, not for short-lived trip verification codes that the customer needs to display.

2. **Stripped from every response**: Despite generating the OTP, all response paths explicitly removed it:
   ```typescript
   return { ride: { ...ride, startOtp: undefined }, ... }
   // and
   return { ...ride, startOtp: undefined };
   ```

3. **Never displayed to customer**: `DriverArrived.tsx` had no OTP display — there was nothing for the rider to verify and nothing for the customer to show.

The result: the entire start-ride OTP verification chain existed in the database and backend logic, but was completely invisible to both parties.

#### Fix — 5-part change

**Backend**: Store OTP as plaintext (correct for a short-lived, single-use trip code — not a password):

```typescript
// BEFORE
const rawOtp = this.geo.generateOTP(TRIPS_CONFIG.OTP_LENGTH);
const hashedOtp = await bcrypt.hash(rawOtp, this.SALT_ROUNDS);
// stored: hashedOtp — impossible to retrieve

// AFTER
const rawOtp = this.geo.generateOTP(TRIPS_CONFIG.OTP_LENGTH);
// stored: rawOtp — can be returned to customer
```

**Backend**: Compare OTP as plaintext string instead of bcrypt:

```typescript
// BEFORE
const isMatch = await bcrypt.compare(otp, ride.startOtp || '');

// AFTER
if (!ride.startOtp || otp.trim() !== ride.startOtp.trim())
  throw new BadRequestException('Invalid OTP');
```

**Backend**: Return `startOtp` from `getCurrentRide` and `getRideById` (removed `startOtp: undefined` strip).

**Frontend store** (`store/ride.ts`): Added `startOtp: string | null` field and `setStartOtp` setter, persisted to localStorage.

**Frontend sync** (`useRideSynchronization.ts`): OTP set in store when status is `confirmed` or `arrived`, cleared to `null` once `in-progress`.

**Frontend UI** (`DriverArrived.tsx`): Added a prominent amber OTP display block:

```tsx
{startOtp && (
  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
    <p className="text-xs font-bold text-amber-600 uppercase">Trip Code — Share with driver</p>
    <p className="text-3xl font-black font-mono tracking-widest text-amber-800">{startOtp}</p>
    <p className="text-xs text-amber-500">Driver enters this to start the trip</p>
  </div>
)}
```

---

### 🔴 BUG 4 — Addresses displayed "Unknown, Unknown" to users

**Severity**: High — All ride history and active ride UI showed corrupted address strings  
**Files**: `rides.service.ts`, `ride.mapper.ts`

#### Root Cause

When addresses were persisted during `requestRide`, `city` and `state` were hardcoded:

```typescript
// BEFORE
city: 'Unknown',
state: 'Unknown',
```

The frontend mapper's `constructAddressText` only filtered falsy values (`Boolean(p)`), so the string `'Unknown'` passed through unchanged, producing addresses like `"Victoria Island, Unknown, Unknown"`.

#### Fix

**Backend**: Changed hardcoded values to empty strings so the mapper receives falsy-equivalent values:

```typescript
// AFTER
city: '',
state: '',
```

**Frontend mapper**: Added explicit guard against legacy `'Unknown'` records already in the database:

```typescript
// AFTER
const parts = [street, city, state].filter(
  (p): p is string => Boolean(p) && p.toLowerCase() !== 'unknown'
);
```

---

## Known Risks (Not Fixed — Require Product Decision)

| # | Risk | Severity | Recommendation |
|---|------|----------|----------------|
| 5 | **Fare is client-provided, not re-validated** — user can send `fare: 1` as long as distance matches | High | Inject `FareService` into `RidesService`; reject fares that differ from server-computed fare by >20% |
| 6 | **`POST /fare/ride` is unauthenticated** — no `@UseGuards` on the fare controller | Low | Add `@UseGuards(JwtAuthGuard)` |
| 7 | **CARD payment abandonment leaves orphaned PENDING rides** — `RidesCleanupService` only recovers `REQUESTED` rides, not abandoned `PENDING` ones | Medium | Add cron to cancel `PENDING` rides older than 10 minutes |
| 8 | **`Share Trip` and `SOS` buttons are non-functional stubs** in `TripInProgress.tsx` | Low | Implement or label "Coming Soon" with visible disabled state |
| 9 | **Two redundant fare endpoints with different logic** — `/fare/ride` (used) vs `/trips/rides/estimate` (unused) | Low | Remove or redirect `/trips/rides/estimate` to `FareService` |

---

## What Was Not Broken (Confirmed Working)

- **Authentication**: All trip endpoints protected by `JwtAuthGuard`. User isolation enforced on every query (`customerId: userId`).
- **Idempotency**: `x-idempotency-key` header required and enforced — duplicate ride requests safely deduplicated.
- **Duplicate ride guard**: Active ride conflict detection prevents double-booking.
- **Socket events**: Full event chain (`DRIVER_FOUND`, `DRIVER_ARRIVED`, `TRIP_STARTED`, `TRIP_COMPLETED`, `RIDE_CANCELLED`) correctly wired with 15s polling fallback.
- **Cancellation**: Customer can cancel rides in `PENDING/REQUESTED/ACCEPTED` states; `IN_PROGRESS` correctly blocked.
- **Rating system**: Running average updated correctly per ride; integer 1–5 validation enforced.
- **Cleanup cron**: Stuck `REQUESTED` rides re-enqueued every minute; P1017 DB reconnect handled.
- **Anti-tamper distance check**: Server validates client-provided distance against Haversine calculation (1km tolerance).
- **Payment flow (CASH)**: Request → Confirm → REQUESTED → driver matching — end-to-end correct.
- **Payment flow (CARD)**: Paystack redirect, callback page, `pending_ride` localStorage handoff — correctly implemented.
- **State recovery**: `useRideSynchronization` correctly restores active ride on page refresh or tab switch.
- **Mapper**: All field renames, null safety, and status formatting handled correctly.

---

## Summary of Changes

| File | Change |
|------|--------|
| `backend/src/users/trips/rides.service.ts` | Accept `ARRIVED` in `startRide`; add `ARRIVED` to `getCurrentRide`; store OTP as plaintext; remove bcrypt from OTP flow; return OTP in responses; fix `city`/`state` to empty string |
| `web/.../store/ride.ts` | Added `startOtp` state field and `setStartOtp` setter; persisted to localStorage |
| `web/.../hooks/useRideSynchronization.ts` | Sync OTP from backend; clear OTP after trip starts |
| `web/.../components/DriverArrived.tsx` | Display OTP prominently to customer |
| `web/.../components/RideSelection.tsx` | Store OTP from `createRide` response |
| `web/.../services/mappers/ride.mapper.ts` | Filter `'unknown'` strings from address construction |
