# Customer Web App — Audit Fixes

Based on the production-level audit (Feb 2026). Ordered by priority.

---

## CRITICAL

---

### [C1] ~~`confirmRide()` Never Called — Cash Payment Flow Broken~~ ✅ RESOLVED — Cash Removed

**File:** `src/app/main/ride/components/PostDriverPayment.tsx`

**Resolution:** Cash payment was **removed entirely** from the web app. `PostDriverPayment` now only presents card payment (Paystack). The `handleCash` handler, the `Banknote` icon import, the `SecondaryButton` for cash, and the two-column payment grid have all been deleted. The component now renders a single full-width "Pay with Card" button.

This eliminates the `confirmRide()` bug entirely for the web app — card payments are confirmed through the Paystack webhook on the backend, requiring no separate `confirmRide()` call from the client.

~~**Problem:** When the user selects **Cash**, `setPaymentConfirmed(true)` and `setRideStatus("confirmed")` are called locally, but `RideService.confirmRide()` is **never called**. The backend never receives payment method confirmation for cash rides. The ride may remain in an unconfirmed/limbo state server-side.~~

**Current code (`handleCash`):**

```ts
const handleCash = () => {
  setPaymentConfirmed(true);
  setRideStatus("confirmed");
  toast.success(
    `${driver?.name ?? "Driver"} is on the way! Pay cash on arrival.`,
  );
};
```

**Fix:**

```tsx
const handleCash = async () => {
  if (!rideId || !session?.accessToken) {
    toast.error("Unable to confirm ride. Please try again.");
    return;
  }
  setIsProcessing(true);
  try {
    await RideService.confirmRide(rideId, "CASH", session.accessToken);
    setPaymentConfirmed(true);
    setRideStatus("confirmed");
    toast.success(
      `${driver?.name ?? "Driver"} is on the way! Pay cash on arrival.`,
    );
  } catch (err: any) {
    console.error("Cash confirm failed:", err);
    toast.error(err?.message || "Failed to confirm ride. Please try again.");
  } finally {
    setIsProcessing(false);
  }
};
```

---

### [C2] Stale Closure — `paymentConfirmed` Missing from `useCallback` Deps

**File:** `src/app/main/ride/hooks/useRideSynchronization.ts`

**Problem:** `statusMap` is built using `paymentConfirmed` from the outer scope, but `syncRideState` is memoised with `useCallback` and does **not** include `paymentConfirmed` in its dependency array. After the user confirms payment, the 15-second poll continues using a stale `statusMap` that maps `ACCEPTED → "awaiting-payment"` instead of `"confirmed"`, potentially pushing the UI back to the payment screen.

**Current code:**

```ts
const statusMap: Record<RideStatus, RideStage> = {
  DRIVER_ACCEPTED: paymentConfirmed ? "confirmed" : "awaiting-payment",
  ACCEPTED: paymentConfirmed ? "confirmed" : "awaiting-payment",
  // ...
};

const syncRideState = useCallback(
  async (token: string) => {
    // statusMap used here — but stale if paymentConfirmed changed
  },
  [setRideId, setRideStatus, setPickupLocation, ...] // ← paymentConfirmed MISSING
);
```

**Fix — move `statusMap` inside `syncRideState` and add `paymentConfirmed` to deps:**

```ts
const syncRideState = useCallback(
  async (token: string) => {
    // Build statusMap fresh on every invocation so it always reflects
    // the current paymentConfirmed value (no stale-closure risk).
    const statusMap: Record<RideStatus, RideStage> = {
      PENDING: "idle",
      REQUESTED: "searching",
      SEARCHING_DRIVER: "searching",
      DRIVER_ASSIGNED: "searching",
      DRIVER_ACCEPTED: paymentConfirmed ? "confirmed" : "awaiting-payment",
      ACCEPTED: paymentConfirmed ? "confirmed" : "awaiting-payment",
      PAID: "confirmed",
      ARRIVED: "arrived",
      IN_PROGRESS: "in-progress",
      COMPLETED: "finished",
      CANCELLED: "idle",
      CANCELLED_BY_USER: "idle",
      CANCELLED_BY_DRIVER: "idle",
      CANCELLED_BY_SYSTEM: "idle",
    };

    try {
      const backendRide = await RideService.getCurrentRide(token);
      // ... rest of function unchanged
    } catch (error: any) {
      // ... unchanged
    }
  },
  [
    paymentConfirmed, // ← ADD THIS
    setRideId,
    setRideStatus,
    setPickupLocation,
    setDropoffLocation,
    setPickupAddress,
    setDropoffAddress,
    setDriver,
    setTripSummary,
    setStartOtp,
    setRideType, // ← ADD THIS (also used inside but missing from deps)
  ],
);
```

---

### [C3] Socket Dies During Paystack Redirect — Events Permanently Lost

**File:** `src/app/main/ride/page.tsx`

**Problem:** The Ride page mounts the socket connection and **disconnects it on unmount** (`return () => { socketService.disconnect(); }`). When the user is redirected to Paystack, the page unmounts, the socket disconnects. Events emitted during the Paystack session (`DRIVER_FOUND`, `DRIVER_ARRIVED`, `TRIP_STARTED`) are permanently lost. Recovery relies entirely on the 15s poll, causing up to 15s of wrong UI state.

Additionally, on return from Paystack, the payment callback page hardcodes `setRideStatus("searching")` regardless of actual backend state.

**Fix Part 1 — Do not disconnect socket on Ride page unmount when payment is in-flight:**

```tsx
// src/app/main/ride/page.tsx
useEffect(() => {
  if (session?.accessToken && !socketService.isConnected()) {
    socketService.connect(session.accessToken);
  }
  return () => {
    // Only disconnect if not mid-payment (pending_ride flag means Paystack redirect)
    const isPendingPayment = localStorage.getItem("pending_ride") === "true";
    if (!isPendingPayment) {
      socketService.disconnect();
    }
  };
}, [session?.accessToken]);
```

**Fix Part 2 — Resolve actual backend status before navigating back (payment callback):**

```tsx
// src/app/payment/callback/page.tsx  — inside the isRide branch, after verifyAndComplete succeeds
if (isRide) {
  const pendingRideId = localStorage.getItem("pending_ride_id");
  if (pendingRideId && token) {
    setRideId(pendingRideId);
    // Attempt to resolve the real current status before navigating
    try {
      const currentRide = await RideService.getCurrentRide(token);
      if (currentRide) {
        const realStatus = currentRide.status;
        // Map known terminal-or-active statuses
        const immediateStatus: Record<string, RideStage> =
          {
            REQUESTED: "searching",
            SEARCHING_DRIVER: "searching",
            DRIVER_ACCEPTED: "confirmed",
            ACCEPTED: "confirmed",
            PAID: "confirmed",
            ARRIVED: "arrived",
            IN_PROGRESS: "in-progress",
            COMPLETED: "finished",
          }[realStatus] ?? "searching";
        setRideStatus(immediateStatus);
      } else {
        setRideStatus("searching");
      }
    } catch {
      setRideStatus("searching"); // fallback
    }
  }
  localStorage.removeItem("pending_ride");
  localStorage.removeItem("pending_ride_id");
  router.replace("/main/ride");
}
```

---

### [C4] `SocketProvider` / `SocketContext.tsx` Is Dead Code

**File:** `src/context/SocketContext.tsx`, `src/app/providers.tsx`

**Problem:** `SocketContext.tsx` exports `SocketProvider` and `useSocket`, but `SocketProvider` is **never added to `providers.tsx`** and `useSocket` is never called anywhere. The socket is managed entirely inside the Ride page's `useEffect` instead. This creates two co-existing but disconnected socket management strategies — confusing and unmaintainable.

**Fix — Option A (Recommended): Delete `SocketContext.tsx` and centralise in Ride page (current approach, already works)**

```bash
# Delete the dead context file
rm src/context/SocketContext.tsx
```

Then document in `socket.service.ts` that the singleton is managed by consumers directly.

**Fix — Option B: Promote `SocketProvider` to `providers.tsx` and remove local socket management from Ride page**

```tsx
// src/app/providers.tsx — add SocketProvider
import { SocketProvider } from "@/context/SocketContext";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <ThemeProvider ...>
        <SocketProvider>           {/* ← ADD */}
          <GoogleMapsProvider>{children}</GoogleMapsProvider>
        </SocketProvider>
        <ToastContainer ... />
      </ThemeProvider>
    </SessionProvider>
  );
}
```

```tsx
// src/app/main/ride/page.tsx — remove local socket management
// DELETE the following useEffect entirely:
// useEffect(() => {
//   if (session?.accessToken && !socketService.isConnected()) {
//     socketService.connect(session.accessToken);
//   }
//   return () => { socketService.disconnect(); };
// }, [session?.accessToken]);
```

Option A is simpler and lower risk. Option B is architecturally cleaner for future pages needing socket access.

---

## HIGH

---

### [H1] `api.ts` Axios Fallback URL Missing `/v1`

**File:** `src/services/api.ts`

**Problem:** The axios instance used by `paymentService` has a fallback base URL of `http://localhost:3000/api` (missing `/v1`). If `NEXT_PUBLIC_API_URL` is unset (e.g., in CI or a misconfigured deployment), all payment API calls will 404.

**Current:**

```ts
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api";
```

**Fix:**

```ts
const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000/api/v1";
```

---

### [H2] No Retry Logic on `createRide`

**File:** `src/app/main/ride/components/RideSelection.tsx`

**Problem:** `RideService.createRide()` has no retry. A brief network blip during this call forces the user to re-select locations, re-calculate fare, and re-confirm. The idempotency key is already in place — it is safe to retry with the same key.

**Fix — add a simple retry helper and use it in `handleRideRequest`:**

```ts
// src/services/ride.service.ts — add utility
async function withRetry<T>(
  fn: () => Promise<T>,
  attempts = 3,
  delayMs = 1000,
): Promise<T> {
  let lastError: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err: any) {
      lastError = err;
      // Don't retry on validation errors (4xx except 408/429) or aborts
      if (
        err?.status >= 400 &&
        err?.status < 500 &&
        err?.status !== 408 &&
        err?.status !== 429
      )
        throw err;
      if (i < attempts - 1)
        await new Promise((r) => setTimeout(r, delayMs * (i + 1)));
    }
  }
  throw lastError;
}

// In handleRideRequest — wrap the createRide call:
const response = await withRetry(
  () => RideService.createRide(payload, session.accessToken, idempotencyKey),
  3,
  1000,
);
```

---

### [H3] No UI Notification When Socket Exhausts Reconnection Attempts

**File:** `src/services/socket.service.ts`

**Problem:** After 5 failed reconnection attempts, the socket silently dies. The user receives no indication that live tracking has stopped working. Only the 15s poll fallback remains active, but the user doesn't know.

**Fix — expose a callback or Zustand action for exhaustion:**

```ts
// src/services/socket.service.ts
connect(accessToken: string, onExhausted?: () => void) {
  // ...existing setup...

  this.socket.io.on("reconnect_failed", () => {
    console.warn("Socket: all reconnection attempts exhausted.");
    onExhausted?.();
  });

  return this.socket;
}
```

```tsx
// src/app/main/ride/page.tsx — pass a toast callback
socketService.connect(session.accessToken, () => {
  toast.warn(
    "Live tracking disconnected. Status updates may be delayed by up to 15 seconds.",
    { autoClose: false, toastId: "socket-exhausted" },
  );
});
```

---

### [H4] 15s Status Lag After Paystack Return — Hardcoded `"searching"` Status

Already covered in **C3 Fix Part 2** above. The callback page should call `RideService.getCurrentRide()` and map the real status before navigating back, eliminating the 15s gap.

---

### [H5] Duplicate `getCurrentRide()` Call on `TRIP_COMPLETED`

**File:** `src/app/main/ride/components/RideSocketListener.tsx`

**Problem:** When `TRIP_COMPLETED` fires, the socket handler immediately calls `RideService.getCurrentRide()` to fetch the final fare. Within 15s, the poll in `useRideSynchronization` also calls `getCurrentRide()` for its regular sync. These two calls race.

**Fix — rely solely on the polling hook for the final fetch; just set status in the socket handler:**

```tsx
// In RideSocketListener.tsx — onTripCompleted handler:
onTripCompleted: (data) => {
  try {
    if (data.rideId !== rideId) return;
    setRideStatus("finished");
    toast.success("Trip completed!");
    // ← REMOVE the getCurrentRide() call here.
    // useRideSynchronization will sync within 15s and restore tripSummary
    // via the statusMap "finished" → setTripSummary branch.
  } catch (error) {
    console.error("Socket error (onTripCompleted):", error);
  }
},
```

If near-instant fare display is desired, trigger a one-shot sync instead of a direct API call:

```tsx
// Option: fire a forced single sync via the store or a ref exposed from useRideSynchronization
// (requires refactoring useRideSynchronization to expose syncRideState externally)
```

---

### [H6] `isConfiguring` Persisted to localStorage — LocationSelector Remounts on Reload

**File:** `src/app/main/ride/store/ride.ts`

**Problem:** `isConfiguring: 'pickup' | 'dropoff' | null` is included in the Zustand `partialize` whitelist. If the user reloads while pinning a location, the `LocationSelector` overlay blindsides them on the next load.

**Fix — remove from partialize:**

```ts
// src/app/main/ride/store/ride.ts — partialize function
partialize: (state) => ({
  rideId: state.rideId,
  pickupLocation: state.pickupLocation,
  dropoffLocation: state.dropoffLocation,
  pickupAddress: state.pickupAddress,
  dropoffAddress: state.dropoffAddress,
  rideStatus: state.rideStatus,
  rideType: state.rideType,
  paymentConfirmed: state.paymentConfirmed,
  lockedEstimate: state.lockedEstimate,
  startOtp: state.startOtp,
  driverLocation: state.driverLocation,
  driverHeading: state.driverHeading,
  driver: state.driver,
  tripSummary: state.tripSummary,
  rating: state.rating,
  feedback: state.feedback,
  // isConfiguring: state.isConfiguring,  ← REMOVE THIS LINE
  routePolyline: state.routePolyline,
}),
```

---

### [H7] No Idempotency Key on `cancelRide`

**File:** `src/services/ride.service.ts`, all cancel call-sites

**Problem:** `cancelRide` uses PATCH with no idempotency key. If retry logic is later added (or the user double-taps), multiple cancel requests could be sent, each logging a separate cancellation event on the backend.

**Fix:**

```ts
// src/services/ride.service.ts
static async cancelRide(rideId: string, reason?: string, token?: string) {
  return ApiService.patch(
    `/trips/rides/${rideId}/cancel`,
    { reason },
    token,
    { headers: { "x-idempotency-key": `cancel-${rideId}` } },
  );
}
```

Using `cancel-${rideId}` as the key is deterministic and naturally idempotent — repeated cancellations of the same ride produce the same key.

---

## MEDIUM

---

### [M1] `ride_update` Event Name Casing Inconsistency

**File:** `src/services/socket.service.ts`

**Problem:** All socket events use `SCREAMING_SNAKE_CASE` except `ride_update` (lowercase). If the backend normalises this, the frontend handler silently stops working.

**Fix — standardise casing and document the contract:**

```ts
// src/services/socket.service.ts
// Change:
socketService.on("ride_update", callbacks.onRideUpdate);
// ...
socketService.off("ride_update");

// To (match backend exactly — confirm with backend team):
socketService.on("RIDE_UPDATE", callbacks.onRideUpdate);
// ...
socketService.off("RIDE_UPDATE");
```

Add a comment block above the event subscriptions:

```ts
// SOCKET EVENT CONTRACT
// All events follow SCREAMING_SNAKE_CASE. Backend emits to room `user_${customerId}`.
// Confirm any changes with the backend rides gateway before modifying names here.
```

---

### [M2] `paymentConfirmed` Local-Only Flag Can Desync After Cookie Clear

**File:** `src/app/main/ride/hooks/useRideSynchronization.ts`

**Problem:** If the user clears cookies or opens the ride in a new browser tab, `paymentConfirmed` resets to `false`. The sync then maps `ACCEPTED → "awaiting-payment"` and shows the payment selection screen again for an already-paid ride.

**Fix — treat `PAID` status as the canonical confirmation, and also check backend-side if a payment exists:**

```ts
// In statusMap inside syncRideState (after C2 fix is applied):
DRIVER_ACCEPTED: paymentConfirmed || backendRide.paymentMethod ? "confirmed" : "awaiting-payment",
ACCEPTED:        paymentConfirmed || backendRide.paymentMethod ? "confirmed" : "awaiting-payment",
PAID:            "confirmed", // Always confirmed — payment is verified server-side
```

This requires `BackendRide` to expose `paymentMethod` (check the Prisma schema / ride mapper). If not already mapped, add it to `ride.mapper.ts`.

---

### [M3] Stale `driverLocation` Persists on Page Reload

**File:** `src/app/main/ride/store/ride.ts`

**Problem:** `driverLocation` and `driverHeading` are persisted to localStorage. On page reload, the map briefly shows the driver at their last known position from the previous session before live data arrives. This can cause a jarring jump.

**Fix — remove from partialize:**

```ts
partialize: (state) => ({
  // ... keep all existing fields except:
  // driverLocation: state.driverLocation,  ← REMOVE
  // driverHeading: state.driverHeading,    ← REMOVE
}),
```

Driver location will be repopulated within 5s (REST fallback poll) or immediately on the next socket event.

---

### [M4] Driver PII Logged in Production

**File:** `src/app/main/ride/components/RideSocketListener.tsx`, `src/services/socket.service.ts`

**Problem:** Driver name, phone, and vehicle details are logged via `console.log()` in production builds. These appear in browser DevTools and can be scraped.

**Fix — gate all non-error logs behind a dev-only guard:**

```ts
// Use a shared debug logger utility
// src/lib/logger.ts
export const devLog = (...args: unknown[]) => {
  if (process.env.NODE_ENV !== "production") {
    console.log(...args);
  }
};

// Replace in RideSocketListener.tsx:
// console.log("✅ Driver Found:", driver.name);
devLog("✅ Driver Found:", driver.name);

// Replace in socket.service.ts:
// console.log("✅ Socket connected:", this.socket?.id);
devLog("✅ Socket connected:", this.socket?.id);
```

---

### [M5] No Production Error Tracking

**Problem:** `GlobalErrorBoundary` swallows errors silently. Unhandled promise rejections are not captured. There is no visibility into production failures.

**Fix — integrate Sentry (or equivalent):**

```bash
yarn add @sentry/nextjs
```

```ts
// src/components/GlobalErrorBoundary.tsx — in componentDidCatch:
componentDidCatch(error: Error, info: React.ErrorInfo) {
  Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
}
```

```ts
// next.config.ts — wrap with withSentryConfig
import { withSentryConfig } from "@sentry/nextjs";
export default withSentryConfig(nextConfig, { ... });
```

Minimum captures needed:

- `GlobalErrorBoundary.componentDidCatch`
- Unhandled promise rejections in `handleRideRequest`, `handleCash`, `handleCard`
- Socket exhaustion event (from H3 fix)

---

### [M6] Cancel Doesn't Handle "Already Cancelled" (409/404)

**Files:** `FindingDriver.tsx`, `DriverArrived.tsx`, `PostDriverPayment.tsx`

**Problem:** If the ride is already cancelled (by driver or system), the `cancelRide` PATCH returns 404 or 409. The current catch block shows a generic "Failed to cancel" error, leaving the button disabled and the user confused.

**Fix — treat 404/409 as successful cancellation (ride is gone either way):**

```ts
// Apply to all three cancel handlers:
try {
  await RideService.cancelRide(rideId, reason, session?.accessToken);
} catch (err: any) {
  // If ride is already gone, treat as success
  if (err?.status === 404 || err?.status === 409) {
    // Fall through to reset below
  } else {
    console.error("Cancellation failed:", err);
    toast.error("Failed to cancel. Please try again.");
    setIsCancelling(false);
    return;
  }
}
// Reset state regardless
toast.info("Ride cancelled.");
setRideStatus("idle");
setRideId(null);
```

---

### [M7] Socket Token Not Refreshed on Session Renewal

**File:** `src/app/main/ride/page.tsx`

**Problem:** If NextAuth silently refreshes the session (unlikely with the current 7-day JWT, but possible if the backend invalidates tokens), the socket continues using the old token. The backend may reject socket messages without the client knowing.

**Fix — reconnect socket whenever `accessToken` changes:**

```tsx
// src/app/main/ride/page.tsx
useEffect(() => {
  if (!session?.accessToken) return;

  // If already connected with a different token, reconnect
  if (socketService.isConnected()) {
    // socket.io-client doesn't expose the auth token after connect,
    // so we disconnect and reconnect to guarantee the token is fresh.
    socketService.disconnect();
  }

  socketService.connect(session.accessToken, () => {
    toast.warn("Live tracking disconnected. Updates may be delayed.", {
      toastId: "socket-exhausted",
    });
  });

  return () => {
    const isPendingPayment = localStorage.getItem("pending_ride") === "true";
    if (!isPendingPayment) {
      socketService.disconnect();
    }
  };
}, [session?.accessToken]); // accessToken in deps — reconnects if token changes
```

---

### [M8] Payment `callbackUrl` Relies on Backend Appending Path

**File:** `src/app/main/ride/components/PostDriverPayment.tsx`

**Problem:** The `callbackUrl` sent to Paystack is `window.location.origin` (e.g., `https://asoose.com`). The comment says "Backend appends `/payment/callback`". If this assumption is wrong, Paystack returns the user to the root domain and the `reference` query param is lost — payment cannot be verified.

**Fix — send the full callback URL explicitly from the frontend:**

```ts
// PostDriverPayment.tsx — handleCard():
const frontendOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3001";

// Change:
callbackUrl: frontendOrigin,

// To:
callbackUrl: `${frontendOrigin}/payment/callback`,
```

Verify with the backend team whether `/payment/callback` is appended server-side. If it is, revert this change and document that behaviour explicitly in a comment.

---

## LOW

---

### [L1] Remove Dead Code from `ride.service.ts`

**File:** `src/services/ride.service.ts`

**Problem:** `getVehicleTypes()` and `getRideById()` are exported but never called anywhere in the ride page flow.

**Fix:** Remove or mark with a `// TODO: wire up` comment. At minimum add JSDoc noting where they should be used:

```ts
/**
 * @deprecated Not yet wired to any UI. Wire to RideSelection if vehicle type
 * selector is restored, or remove in next cleanup pass.
 */
static async getVehicleTypes(...) { ... }
```

---

### [L2] Remove Dead `SocketContext.tsx`

Already covered in **C4**. After choosing Option A or B, delete the unused file.

---

### [L3] ETA Uses Fixed 30km/h Speed — Replace with Real ETA

**Files:** `DriverArrived.tsx`, `TripInProgress.tsx`

**Problem:** ETA is calculated as `distance / 0.5km/min` (= 30km/h). This is wildly inaccurate in traffic.

**Fix:** Use the backend's ETA from the ride data (if exposed), or call the Google Maps Distance Matrix API:

```ts
// Example for DriverArrived.tsx — replace Euclidean calculation with Distance Matrix
const service = new google.maps.DistanceMatrixService();
const result = await service.getDistanceMatrix({
  origins: [driverLocation],
  destinations: [pickupLocation],
  travelMode: google.maps.TravelMode.DRIVING,
  drivingOptions: { departureTime: new Date() },
});
const element = result.rows[0]?.elements[0];
if (element?.status === "OK") {
  setEtaMinutes(
    Math.ceil(
      element.duration_in_traffic?.value / 60 ?? element.duration.value / 60,
    ),
  );
  setDistanceKm(element.distance.value / 1000);
}
```

Note: Distance Matrix API calls count against Maps API billing quota.

---

### [L4] Google Maps API Key HTTP Referrer Restrictions

**Problem:** `NEXT_PUBLIC_GOOGLE_MAPS_KEY` in `.env.local`. Even if not committed to git, if the key has no referrer restrictions in Google Cloud Console, it can be abused if observed in browser network tabs.

**Fix:**

1. Go to Google Cloud Console → Credentials → your Maps API key.
2. Under "Application restrictions" → select "HTTP referrers (web sites)".
3. Add `https://asoose.com/*` and `http://localhost:3001/*`.
4. Under "API restrictions", restrict to: Maps JavaScript API, Places API, Directions API, Distance Matrix API, Geocoding API only.

---

### [L5] localStorage Payment Keys Not Validated

**File:** `src/app/payment/callback/page.tsx`

**Problem:** `pending_ride_id` is read from localStorage and set directly as `rideId` without validation. An XSS payload could plant a malicious value, causing the wrong ride to be restored after payment.

**Fix — validate UUID format before trusting:**

```ts
const pendingRideId = localStorage.getItem("pending_ride_id");
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

if (pendingRideId && UUID_RE.test(pendingRideId)) {
  setRideId(pendingRideId);
} else if (pendingRideId) {
  console.warn("Suspicious pending_ride_id value — ignoring:", pendingRideId);
}
```

---

### [L6] `routeAbortControllerRef` Not Reset After Abort

**File:** `src/app/main/ride/components/RideSelection.tsx`

**Problem:** `routeAbortControllerRef.current?.abort()` is called in `handleClearPickup`/`handleClearDropoff` but the ref is never set to `null` afterwards. The ref holds a reference to a resolved controller, which is harmless but misleading.

**Fix:**

```ts
const handleClearPickup = () => {
  routeAbortControllerRef.current?.abort();
  routeAbortControllerRef.current = null; // ← ADD
  estimateAbortControllerRef.current?.abort();
  estimateAbortControllerRef.current = null; // ← ADD
  clearPickupLocation();
  setPickupAddress("");
  setEstimates(null);
  toast.info("Pickup location cleared");
};
```

---

### [L7] `GlobalErrorBoundary` Has No Error Reporting

**File:** `src/components/GlobalErrorBoundary.tsx`

**Problem:** Caught React tree errors are only rendered as fallback UI — they are not reported anywhere.

**Fix:**

```tsx
componentDidCatch(error: Error, info: React.ErrorInfo) {
  // Log to your observability platform
  console.error("[GlobalErrorBoundary] Caught error:", error, info);
  // Sentry.captureException(error, { extra: { componentStack: info.componentStack } });
}
```

---

## Summary Table

| ID  | Severity | File(s)                                                           | Status                                                                           |
| --- | -------- | ----------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| C1  | Critical | `PostDriverPayment.tsx`                                           | ✅ Cash removed                                                                  |
| C2  | Critical | `useRideSynchronization.ts`                                       | ✅                                                                               |
| C3  | Critical | `page.tsx`, `callback/page.tsx`                                   | ✅                                                                               |
| C4  | Critical | `SocketContext.tsx`, `providers.tsx`                              | ✅                                                                               |
| H1  | High     | `api.ts`                                                          | ✅ `/v1` added to fallback URL                                                   |
| H2  | High     | `RideSelection.tsx`                                               | ✅ `withRetry` helper wraps `createRide` (3×, 1s, 4xx skipped)                   |
| H3  | High     | `socket.service.ts`, `SocketContext.tsx`                          | ✅ `reconnect_failed` → toast warning + `setIsConnected(false)`                  |
| H4  | High     | `callback/page.tsx`                                               | ✅ (covered in C3)                                                               |
| H5  | High     | `RideSocketListener.tsx`                                          | ✅ Duplicate `getCurrentRide()` removed from `onTripCompleted`                   |
| H6  | High     | `ride.ts` (store)                                                 | ✅ `isConfiguring` removed from `partialize` whitelist                           |
| H7  | High     | `ride.service.ts`                                                 | ✅ `x-idempotency-key: cancel-{rideId}` header added                             |
| M1  | Medium   | `socket.service.ts`                                               | ✅ `"ride_update"` → `"RIDE_UPDATE"` (subscribe + unsubscribe)                   |
| M2  | Medium   | `useRideSynchronization.ts`                                       | ✅ `statusMap` built after fetch; `payment?.method` used as server-side fallback |
| M3  | Medium   | `ride.ts` (store)                                                 | ✅ `driverLocation` / `driverHeading` removed from `partialize`                  |
| M4  | Medium   | `RideSocketListener.tsx`, `socket.service.ts`, `lib/logger.ts`    | ✅ `devLog` utility created; all PII `console.log` calls gated                   |
| M5  | Medium   | `GlobalErrorBoundary.tsx`, `lib/reportError.ts`                   | ✅ `reportError` shim created; `componentDidCatch` wired; Sentry-ready           |
| M6  | Medium   | `FindingDriver.tsx`, `DriverArrived.tsx`, `PostDriverPayment.tsx` | ✅ 404/409 treated as successful cancellation                                    |
| M7  | Medium   | `SocketContext.tsx`                                               | ✅ Disconnect-then-reconnect when `accessToken` changes                          |
| M8  | Medium   | `PostDriverPayment.tsx`                                           | ✅ `callbackUrl` is now explicit `${origin}/payment/callback`                    |
| L1  | Low      | `ride.service.ts`                                                 | ✅ `@deprecated` JSDoc added to `getRideById` and `getVehicleTypes`              |
| L2  | Low      | `SocketContext.tsx`                                               | ✅ Only one file exists; already the active provider (C4)                        |
| L3  | Low      | `DriverArrived.tsx`, `TripInProgress.tsx`                         | ✅ Distance Matrix API used; Haversine+30km/h kept as graceful fallback          |
| L4  | Low      | Google Cloud Console                                              | ⚠️ Manual — restrict key to HTTP referrers + specific APIs in GCP Console        |
| L5  | Low      | `callback/page.tsx`                                               | ✅ UUID regex validation already added in C3                                     |
| L6  | Low      | `RideSelection.tsx`                                               | ✅ `routeAbortControllerRef` and `estimateAbortControllerRef` nulled after abort |
| L7  | Low      | `GlobalErrorBoundary.tsx`                                         | ✅ `reportError` shim wired in M5; Sentry-ready                                  |
