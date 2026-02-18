# Ride History Page Audit Report
**File**: `web/customer-web-app/src/app/main/ride/history/[id]/page.tsx`  
**Date**: February 17, 2026

---

## Executive Summary
The ride details page has multiple API mismatches, type misalignments, and potential data transformation issues. While the core flow works, there are data mapping problems between backend and frontend that could cause runtime errors or missing data rendering.

---

## Critical Issues

### 🔴 **1. Address Data Shape Mismatch**

**Location**: Page component and Ride Service type definition

**Issue**: The `LocationPayloadDto` interface expects `{ addressText?, placeId?, lat?, lng? }`, but the backend returns Address model with `{ id, street, city, state, lat, lng, phone?, label }`.

**Backend Returns** (from `rides.service.ts` line 607):
```typescript
include: {
  pickupAddress: true,      // Full Address model
  dropoffAddress: true,     // Full Address model
}
```

**Frontend Expects** (from `ride.service.ts` line 31):
```typescript
export interface LocationPayloadDto {
  addressText?: string;     // ❌ Not provided by backend
  placeId?: string;         // ❌ Not provided by backend
  lat?: number;             // ✅ Available
  lng?: number;             // ✅ Available
}
```

**Impact**: 
- Render fails when accessing `ride.pickupAddress.addressText` → returns `undefined`
- Map initialization will fail if trying to use `addressText` as a fallback
- In page.tsx line 176: `{ride.pickupAddress.addressText || 'Pinned Location'}` - the addressText is never populated

**Fix Required**: Transform address data or update the backend to include derived `addressText` field.

---

### 🔴 **2. Driver Field Renamed but Not Updated**

**Location**: Page component line 144

**Issue**: The Ride interface has `driver?: Driver`, but the backend returns `rider` (not `driver`).

**Page.tsx** (line 144):
```typescript
{ride.driver && (
  <div>
    <img src={ride.driver.image || '/profile.jpg'} alt="Driver" />
    <p>{ride.driver.name}</p>
```

**Backend Returns** (rides.service.ts line 608):
```typescript
include: {
  rider: { include: { vehicle: true } }  // ❌ Returns rider, not driver
}
```

**Frontend Type** (ride.service.ts line 18):
```typescript
export interface Ride {
  driver?: Driver;  // ❌ Alias mismatch
```

**Impact**: 
- `ride.driver` will always be `undefined`
- Driver card section won't render even when driver exists
- No type checking catches this error

**Fix Required**: Either:
1. Map backend `rider` → `driver` in the response
2. Update frontend to use `rider` instead of `driver`

---

### 🟡 **3. Missing Payment Data**

**Location**: Page component line 198-200

**Issue**: The page displays `ride.actualFare || ride.estimatedFare`, but neither field is set by the backend's `getRideById`.

**Backend Returns** (rides.service.ts line 607):
```typescript
include: {
  pickupAddress: true,
  dropoffAddress: true,
  rider: { include: { vehicle: true } },
  payment: true,  // ✅ Payment object included
}
```

**Frontend Type** (ride.service.ts line 40):
```typescript
export interface Ride {
  estimatedFare?: number;   // ❌ Set during request, not retrieval
  actualFare?: number;      // ❌ Never set
  paymentStatus?: string;   // ✅ Available
}
```

**Page.tsx** (line 198):
```typescript
<span>{formatMoney(ride.actualFare || ride.estimatedFare)}</span>
```

**Impact**:
- `ride.totalFare` from backend is not mapped to `actualFare`
- Displays ₦0 instead of actual trip fare
- Payment display incomplete

**Actual Backend Field**: `ride.totalFare` (from line 860 in schema)

**Fix Required**: Ensure backend `getRideById` response maps `totalFare` → `actualFare` in transformation layer.

---

### 🟡 **4. Vehicle Plate Number Field Name Mismatch**

**Location**: Page component line 158

**Issue**: Frontend expects `ride.driver.vehicleNumber`, but backend returns `ride.rider.vehicle.plateNumber`.

**Page.tsx** (line 158):
```typescript
<p>{ride.driver.vehicleNumber}</p>
```

**Backend Returns** (Rider model in schema):
```typescript
vehicle: {
  plateNumber: string,  // ❌ Not vehicleNumber
}
```

**Frontend Type** (ride.service.ts line 18):
```typescript
export interface Driver {
  vehicleNumber?: string;  // ❌ Incorrect field name
}
```

**Impact**:
- License plate not displayed
- Shows `undefined` in the vehicle plate section
- UI gap in driver information

**Fix Required**: Map `vehicle.plateNumber` → `vehicleNumber` in response transformation.

---

### 🟡 **5. Missing actualFare Calculation**

**Location**: Backend rides.service.ts getRideById

**Issue**: The method includes `payment` but doesn't transform backend's `totalFare` into `actualFare`.

**Current Return** (rides.service.ts line 613):
```typescript
return { ...ride, startOtp: undefined };
```

**Missing**: Transformation to match frontend interface

```typescript
// Backend has:
ride.totalFare   // The actual charge for the ride

// Frontend expects:
actualFare       // Never populated from getRideById
```

**Impact**:
- Payment display shows incorrect values
- No way to distinguish between estimated and actual fare on history page

---

### 🟠 **6. No Null/Undefined Guards for Coordinates**

**Location**: Page component lines 43-46, 123-127

**Issue**: The code assumes lat/lng are always present but doesn't handle missing coordinates gracefully.

**Page.tsx** (line 43):
```typescript
if (data.pickupAddress.lat && data.dropoffAddress.lat && window.google) {
  // Calculate route
}
```

**But on line 112**:
```typescript
{isLoaded && ride.pickupAddress.lat && ride.dropoffAddress.lat && (
  <GoogleMap ... />
)}
```

**Later in line 176**:
```typescript
<p className="font-medium">{ride.pickupAddress.addressText || 'Pinned Location'}</p>
```

**Issue**: 
- If `addressText` is undefined (which it will be), it falls back to 'Pinned Location'
- But should display actual address structure: `${street}, ${city}, ${state}`
- Or should construct it from backend data

**Impact**:
- User sees "Pinned Location" instead of actual address
- Map may fail to initialize with bad coordinates

---

### 🟠 **7. Google Maps Polyline Encoding Issue**

**Location**: Page component line 49

**Issue**: Using `overview_polyline` from Google Maps DirectionsService without checking if it's already encoded.

**Page.tsx** (line 49):
```typescript
setRoutePolyline(result.routes[0].overview_polyline);
```

**Later** (line 127):
```typescript
{routePolyline && (
  <Polyline 
    path={google.maps.geometry.encoding.decodePath(routePolyline)} 
    options={{ strokeColor: '#000', strokeWeight: 3 }}
  />
)}
```

**Issue**: 
- `overview_polyline` is already a string (encoded)
- Code correctly decodes it, but type mismatch in Page state
- State is typed as `string | null` but should be `PolylineCodec` or similar

**Impact**:
- Low risk but inconsistent typing
- Works but relies on type assumptions

---

### 🟡 **8. Missing Query Parameters in API Call**

**Location**: Page component line 33

**Issue**: No pagination or filtering parameters when fetching ride history might cause issues if backend expects them.

**Ride.service.ts** (line 128):
```typescript
static async getRideHistory(token: string, signal?: AbortSignal): Promise<Ride[]> {
  return ApiService.get<Ride[]>("/trips/rides", token, { signal });
}
```

**Backend Endpoint** (trips.controller.ts line 90):
```typescript
@Get('rides')
async getUserRides(
  @Query('status') status?: string,
  @Query('page') page?: string,
  @Query('limit') limit?: string,
) {
  const pageNum = page ? parseInt(page, 10) : 1;
  const limitNum = limit ? parseInt(limit, 10) : 20;
  return this.tripsService.getUserRides(
    req.user.id,
    status,
    pageNum,
    limitNum,
  );
}
```

**Issue**:
- Backend supports pagination but frontend doesn't use it
- Fetching all rides could be inefficient
- No filtering by status

**Impact**:
- Performance deterioration with many historical rides
- No pagination UI support

---

### 🟠 **9. Status Display Formatting**

**Location**: Page component line 111

**Issue**: Status displayed as-is from database (e.g., "IN_PROGRESS") but not user-friendly.

**Page.tsx** (line 111):
```typescript
<span className="uppercase tracking-wider">
  {ride.status}
</span>
```

**Expected Display**: 
- `IN_PROGRESS` → "In Progress"
- `COMPLETED` → "Completed"  
- `CANCELLED` → "Cancelled"

**Fix Required**: Use a status formatter function

---

### 🟠 **10. Time Display Issues**

**Location**: Page component line 170

**Issue**: Dropoff time always shows "--:--" because completion time is not tracked in the displayable format.

**Page.tsx** (line 170):
```typescript
<div className="relative">
  <p className="text-xs text-zinc-400 mb-1">--:--</p>  {/* ❌ Hardcoded */}
  <p>{ride.dropoffAddress.addressText || 'Pinned Location'}</p>
</div>
```

**Backend Schema** (schema.prisma line 868):
```typescript
completedAt     DateTime?  // Available but not used
```

**Fix Required**: Display `formatTime(ride.completedAt || currentTime)`

---

## Warning Issues

### ⚠️ **11. AccessToken Type Assumption**

**Location**: Page component line 26

**Issue**: Assumes `session?.accessToken` is always a string, but TypeScript type is `unknown`.

**Page.tsx** (line 26):
```typescript
const token = session?.accessToken;
// ... later
const data = await RideService.getRideById(rideId, token);
```

**Issue**: `token` could be `undefined` but passed directly to API call

**Better Practice**: Type guard before using

---

### ⚠️ **12. No Error State Rendering**

**Location**: Page component error handling

**Page.tsx** (line 60):
```typescript
} catch (error) {
  console.error("Failed to fetch ride details:", error);
} finally {
  setLoading(false);
}
```

**Issue**: 
- Error logged but not displayed to user
- No error UI component
- User sees empty state with no explanation

**Better UX**: Show error message with retry option

---

### ⚠️ **13. Race Condition in useEffect**

**Location**: Page component line 27

**Issue**: Multiple dependencies could trigger race conditions with abort signal not being used for all previous requests.

**Page.tsx** (lines 27-57):
```typescript
useEffect(() => {
  // ... fetch logic
  fetchRide();
}, [session?.accessToken, params.id, isLoaded]);
```

**Issue**:
- If dependencies change multiple times quickly, old requests might override new ones
- No cleanup function to cancel in-flight requests
- AbortSignal passed but not used in directionsService call

---

## Data Transformation Issues

### **Backend to Frontend Type Mapping**

| Field | Backend Type | Frontend Type | Issue |
|-------|---|---|---|
| `driver` | `rider: Rider` | `driver?: Driver` | ❌ Renamed, unused |
| `driverName` | `rider.name` | `driver.name` | ❌ Nested, check null |
| `vehicleNumber` | `vehicle.plateNumber` | `vehicleNumber` | ❌ Wrong field name |
| `actualFare` | `totalFare` | `actualFare` | ❌ Not mapped |
| `addressText` | `street, city, state` | `addressText` | ❌ Not constructed |
| `completedTime` | `completedAt` | Not displayed | ⚠️ Lost data |
| `status` | `RideStatus enum` | Raw enum string | ⚠️ Not formatted |

---

## Recommendations

### Priority 1: Critical Fixes (DO FIRST)
1. ✅ Map backend `rider` → response `driver` field
2. ✅ Map backend `street/city/state` → response `addressText`
3. ✅ Map backend `totalFare` → response `actualFare`
4. ✅ Map backend `vehicle.plateNumber` → response `vehicleNumber`

### Priority 2: Robustness Fixes
5. ✅ Add error state UI with retry button
6. ✅ Implement status formatter utility function
7. ✅ Display completion time or trip duration instead of "--:--"
8. ✅ Add null/undefined guards with proper fallbacks

### Priority 3: Enhancement Fixes
9. ✅ Add pagination support for ride history
10. ✅ Implement abort signal for DirectionsService call
11. ✅ Add loading states for map rendering
12. ✅ Implement ride status badge colors (completed=green, cancelled=red, etc.)

---

## Implementation Priority

**Must Fix**: Issues 1, 2, 3, 4 (blocking functionality)  
**Should Fix**: Issues 5, 6, 7, 8 (UX/robustness)  
**Nice to Have**: Issues 9, 10, 11, 12, 13 (polish)

---

## Testing Checklist

- [ ] Render ride with `driver` details displayed
- [ ] Show actual address (not "Pinned Location")  
- [ ] Display correct fare amount
- [ ] Show vehicle plate number
- [ ] Map renders with polyline
- [ ] Error state displays when API fails
- [ ] Status displays as readable text
- [ ] Coordinates validation works
- [ ] Mobile responsive layout works
- [ ] Dark mode styling works

