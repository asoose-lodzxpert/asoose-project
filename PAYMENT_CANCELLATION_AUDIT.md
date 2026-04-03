# Payment Cancellation Flow - Deep Audit Report
**Date:** April 1, 2026  
**Scope:** Customer web app payment cancellation handling (checkout & delivery flows)  
**Issue:** User gets stuck on "Processing Payment" screen after cancelling payment

---

## Executive Summary

**Root Cause:** When users cancel payment at Paystack, the frontend fails to properly detect and handle this cancellation, leaving the app stuck in a "Processing Payment" state indefinitely. The issue stems from four interconnected problems:

1. **No explicit "CANCELLED" status** in the PaymentStatus enum - cancellations are mapped to FAILED, losing context
2. **Frontend state not reset on cancellation** - PAYMENT_PENDING stage persists indefinitely
3. **Callback flow doesn't distinguish cancellation from failure** - both redirect with generic "failed" status
4. **UI state management lacks recovery logic** - no mechanism to detect and exit cancelled payment state

### Impact
- **User experience:** App appears frozen/"stuck" requiring manual intervention (close app, clear storage)
- **Business impact:** Users unable to retry delivery/checkout, potential order abandonment
- **Data integrity:** Unclear payment states in logs, difficult support troubleshooting

---

## Issue Breakdown

### 1. PAYMENT FLOW ARCHITECTURE

#### Checkout Flow:
```
CheckoutForm.handlePlaceOrder()
  ↓ (setIsProcessing = true)
  → POST /users/orders (create order)
  ↓
  → processPayment(orderId, orderTotal)
    ↓ (localStorage.pending_checkout = true)
    → paymentService.initiatePayment()
    ↓
    → window.location.href = paymentRes.authorizationUrl (Paystack redirect)
    
    [USER REDIRECTED TO PAYSTACK]
    
    [IF CANCELLED/FAILED BY USER]
    → Paystack redirects: GET /api/v1/payment/callback/paystack?reference=...&status=...
      ↓
      → BackendPaymentController.paystackCallback()
      ↓
      → PaymentService.verifyPayment() 
      ↓
      → Browser redirect: /payment/callback?reference=...&status=failed|success
        ↓
        → FrontendPaymentCallbackPage
          ↓ (checks urlStatus !== "success")
          ↓ (calls handleFailure())
          ↓ (router.replace("/main/checkout"))
```

#### Delivery Flow:
```
DeliveryPage.handlePayment()
  ↓ (setStage = PAYMENT_PENDING)
  → paymentService.initiatePayment(type: DELIVERY, deliveryId)
  ↓ (localStorage.pending_delivery_data = {...})
  → window.location.href = authorizationUrl
  
  [USER REDIRECTED TO PAYSTACK]
  
  [IF CANCELLED/FAILED]
  → [Same backend callback flow]
    ↓
    → FrontendPaymentCallbackPage.handleFailure()
      ↓ (does NOT call resetDelivery())
      ↓ (router.replace("/main/delivery"))
        ↓
        → DeliveryPage.recoverState() effect runs
          ↓ (checks stage === PAYMENT_PENDING)
          ↓ (tries to verify payment at reference)
          ↓ (if verification fails, leaves stage = PAYMENT_PENDING [BUG])
```

---

### 2. ROOT CAUSE ANALYSIS

#### Issue #1: No CANCELLED Status in PaymentStatus Enum

**File:** `backend/prisma/schema.prisma`

```prisma
enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED           // Used for both: actual failures AND user cancellations
  REFUNDED
  PARTIALLY_REFUNDED
}
```

**Problem:**
- Paystack maps user cancellation to 'abandoned' status
- Backend's `PaystackService.mapStatus()` maps 'abandoned' → FAILED
- No way to distinguish: "user cancelled" vs "card declined" vs "network error"
- Frontend receives generic FAILED state, can't handle appropriately

**Proof:**
```typescript
// backend/src/payment/paystack.service.ts, line 179-189
private mapStatus(status: string): PaymentStatus {
  switch (status) {
    case 'success':
      return PaymentStatus.COMPLETED;
    case 'failed':
      return PaymentStatus.FAILED;
    case 'abandoned':                    // ← User cancellation
      return PaymentStatus.FAILED;       // ← Same as "failed"
    default:
      return PaymentStatus.PENDING;
  }
}
```

---

#### Issue #2: Frontend State Management - isProcessing Flag Not Reset

**File:** `web/customer-web-app/src/app/main/checkout/checkoutform.tsx`

**Problem:**

1. **State set BEFORE payment initiation:**
   ```typescript
   setIsProcessing(true);  // Line 320
   const res = await fetch(`${API_URL}/users/orders`, ...);
   // ... order created, now redirect to payment
   await processPayment(id, total);
   ```

2. **processPayment doesn't reset on failure:**
   ```typescript
   const processPayment = async (...) => {
     try {
       // ... payload setup
       const paymentRes = await paymentService.initiatePayment(...);
       if (paymentRes.authorizationUrl) {
         window.location.href = paymentRes.authorizationUrl;
         // ← Browser redirects to Paystack, isProcessing=true persists
       }
     } catch (error) {
       // Only catches errors BEFORE redirect
       // If user cancels at Paystack, this doesn't run
     } finally {
       setIsProcessing(false);  // Lines 495-496
       // This runs BEFORE the redirect, so it's reset momentarily
       // Then the browser navigates, component state is lost
     }
   };
   ```

3. **On return from cancelled payment:**
   - User routes back to `/main/checkout`
   - CheckoutForm re-renders with fresh state (isProcessing=false)
   - BUT no indication that payment was cancelled
   - User must manually/blindly retry

---

#### Issue #3: Payment Callback Doesn't Handle Cancellation Explicitly

**File:** `web/customer-web-app/src/app/payment/callback/page.tsx`

**Problem:**

```typescript
// Line 84-88: Fast-fail on non-success URL status
if (urlStatus && urlStatus !== "success") {
  toast.error("Payment was not completed.");  // ← Generic message
  handleFailure();
  return;
}

// Line 139: Check response status
const isSuccess =
  data.status === "COMPLETED" ||
  data.status === "SUCCESS" ||
  data.data?.status === "COMPLETED" ||
  data.data?.status === "SUCCESS";

if (!isSuccess) {
  throw new Error("Payment verification returned non-success status");  // ← No differentiation
}
```

**Issues:**
- All non-success cases treated identically (cancelled = failed = timeout)
- Generic error message doesn't help user understand what to do
- No separate handling path for cancellation

---

#### Issue #4: Delivery Page - PAYMENT_PENDING Stage Persists Indefinitely

**File:** `web/customer-web-app/src/app/main/delivery/page.tsx`

**Problem:**

1. **Stage set BEFORE payment verification:**
   ```typescript
   // Line 503
   setStage(DeliveryStage.PAYMENT_PENDING);
   const userEmail = session?.user?.email || `guest-${Date.now()}@asoose.com`;
   const paymentRes = await paymentService.initiatePayment(...);
   // User redirected to Paystack while stage = PAYMENT_PENDING
   ```

2. **On return from cancelled payment:**
   - Delivery page loads with persisted state (stage = PAYMENT_PENDING)
   - Recovery effect runs (line 170)
   - Calls `recoverState()` which:
     ```typescript
     // Line 194-195: Checks if recovery needed
     const needsRecovery =
       currentStage === DeliveryStage.PAYMENT_PENDING;
     
     if (!needsRecovery) return;
     
     // Line 198: Tries to verify payment
     const isVerified = await DeliveryService.verifyPayment(reference, ...);
     
     if (isVerified === true) {
       handlePaymentSuccess(id);  // Only resets stage if verified
       return;
     }
     
     // Line 201-218: CRITICAL BUG - On failure:
     useDeliveryStore.setState({ activeDeliveryId: id });
     setStage(DeliveryStage.PAYMENT_PENDING);  // ← RE-SETS TO SAME STATE!
     
     const success = await DeliveryService.pollDeliveryStatus(...);
     if (success) {
       handlePaymentSuccess(id);  // Only exits if polling succeeds
     }
     // ← If both fail, stage stays PAYMENT_PENDING!
     ```

3. **Result:** Modal shows "Processing Payment" indefinitely. The "I have completed payment" button exists but doesn't properly handle the case where user actually cancelled.

---

### 3. AFFECTED USER JOURNEYS

#### Journey 1: Checkout → Payment Cancelled
```
✓ User proceeds through checkout
✓ Clicks "Place Order" → order created + redirected to Paystack
✗ User cancels at Paystack
✗ Redirected back to /payment/callback with ?status=failed
✗ handleFailure() → router.replace("/main/checkout")
✗ Checkout form reloads but:
  - No indication payment was cancelled
  - Isprocessing state is fresh (false) → button works
  - BUT previous order is in PENDING state
  - Previous cart state might be cleared (due to how callback works)
  - No recovery/retry mechanism
```

#### Journey 2: Delivery → Payment Cancelled
```
✓ User fills delivery form + calculates fee
✓ Clicks "Pay Securely" → stage=PAYMENT_PENDING + redirected to Paystack
✗ User cancels at Paystack
✗ Redirected back to /payment/callback with ?status=failed
✗ handleFailure() (delivery branch):
  - Does NOT call resetDelivery()
  - router.replace("/main/delivery")
✗ Delivery page reloads:
  - Persisted state has stage=PAYMENT_PENDING (survived reload!)
  - Recovery effect tries to verify payment
  - Verification fails (cancelled payment)
  - Recovery effect RE-SETS stage to PAYMENT_PENDING
  - UI shows "Processing Payment" indefinitely
  - "I have completed payment" button exists but handleManualPaymentCheck probably just re-tries verification
```

---

### 4. EDGE CASES & RACE CONDITIONS

#### Race Condition 1: Webhook Arrives After User Cancels
```
Timeline:
T1: User cancels at Paystack, Paystack updates transaction to 'abandoned'
T2: Backend's paystackCallback receives ?reference=...&status=failed
T3: Backend verifies with Paystack API → status='abandoned' → FAILED
T4: Frontend redirected with ?status=failed
T5: User redirected back to Delivery page
T6: Recovery effect runs, tries to verify
T7: But webhook hasn't arrived yet (async)
T8: Verification returns FAILED
T9: Recovery effect leaves stage=PAYMENT_PENDING

Later:
T10: Webhook arrives with abandoned status
T11: Backend updates Payment record to FAILED
T12: But frontend never gets notified, still stuck
```

#### Race Condition 2: Network Timeout During Recovery
```
Timeline:
T1: User cancels payment (abandoned)
T2: Redirected to /payment/callback
T3: Front-end callback verification takes too long / times out
T4: handleFailure() routes back to /main/delivery
T5: Recovery effect runs
T6: Verification timeout again or fails
T7: pollDeliveryStatus called and times out
T8: Stage stays PAYMENT_PENDING indefinitely
```

#### Race Condition 3: Browser Back Button After Cancellation
```
Timeline:
T1: User cancels payment at Paystack
T2: Some browsers auto-redirect, some show blank page
T3: User clicks browser back button
T4: Delivery page re-mounts with persisted state
T5: Recovery effect may not run (already ran once)
T6: Stage remains PAYMENT_PENDING
```

---

## CHECKLIST: Validation Points

These need testing after fixes:

- [ ] **Cancellation Detection:** Frontend clearly detects "user cancelled" vs "network error"
- [ ] **State Reset:** PAYMENT_PENDING state properly exits on cancellation
- [ ] **UI Messaging:** User sees appropriate message (e.g., "Payment cancelled. Ready to retry?")
- [ ] **Button State:** "Place Order" / "Pay Securely" button is enabled and ready for retry
- [ ] **Cart Preservation:** For checkout, cart items remain (not cleared prematurely)
- [ ] **Delivery Preservation:** For delivery, form data remains (not cleared prematurely)
- [ ] **Multiple Retries:** User can cancel and retry multiple times without issues
- [ ] **Slow Network:** Works with slow/timeout scenarios
- [ ] **Delayed Webhooks:** If webhook arrives after user cancels, state updates correctly
- [ ] **Tab Switching:** Works if user switches tabs between payment and other apps
- [ ] **Session Expiry:** Graceful handling if session expires during payment
- [ ] **No Duplicate Orders:** Cancelling and retrying doesn't create multiple orders

---

## PROPOSED SOLUTIONS

### Solution 1: Add CANCELLED Status to PaymentStatus Enum

**Files to modify:** `backend/prisma/schema.prisma`

```prisma
enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED                 // Actual technical failures
  CANCELLED              // User-initiated cancellation (new!)
  REFUNDED
  PARTIALLY_REFUNDED
}
```

**Benefits:**
- Explicit semantic distinction
- Backend can log/track user cancellations separately
- Frontend can route differently

---

### Solution 2: Update Paystack mapStatus Function

**Files to modify:** `backend/src/payment/paystack.service.ts`

```typescript
private mapStatus(status: string): PaymentStatus {
  switch (status) {
    case 'success':
      return PaymentStatus.COMPLETED;
    case 'failed':
      return PaymentStatus.FAILED;
    case 'abandoned':
      return PaymentStatus.CANCELLED;  // NEW: Explicit mapping
    default:
      return PaymentStatus.PENDING;
  }
}
```

**Benefits:**
- Correctly maps Paystack's 'abandoned' status to CANCELLED
- Backend now tracks cancellations explicitly

---

### Solution 3: Update Payment Callback to Communicate Cancellation

**Files to modify:** `backend/src/payment/payment.controller.ts`

```typescript
@Get('callback/paystack')
async paystackCallback(
  @Query('reference') reference: string,
  @Res() res: Response,
) {
  // ... existing code ...
  const verification = await this.paymentService.verifyPayment(reference, gateway);
  
  // NEW: Explicit cancellation signal
  const statusParam = 
    verification.status === PaymentStatus.COMPLETED 
      ? 'success' 
      : verification.status === PaymentStatus.CANCELLED  // NEW!
        ? 'cancelled'                                      // NEW!
        : 'failed';
  
  return res.redirect(
    `${callbackUrl}/payment/callback?reference=${reference}&status=${statusParam}`
  );
}
```

**Benefits:**
- Backend now explicitly sends "cancelled" status to frontend
- Frontend can handle cancellation differently from other failures

---

### Solution 4: Frontend Payment Callback - Handle Cancellation

**Files to modify:** `web/customer-web-app/src/app/payment/callback/page.tsx`

```typescript
useEffect(() => {
  // ... existing code ...
  const urlStatus = searchParams.get("status");
  
  const handleCancellation = () => {
    // NEW: Specific handler for user-cancelled payments
    toast.warn("Payment cancelled. Ready to try again?");  // Better messaging
    
    if (isRide) {
      localStorage.removeItem("pending_ride");
      localStorage.removeItem("pending_ride_id");
      setPaymentConfirmed(false);
      setRideStatus("payment-required");
      router.replace("/main/ride");
    } else if (isDelivery) {
      // NEW: Clear pending delivery data on cancellation
      // User should be able to restart from beginning if needed
      // OR preserve for retry (TBD based on UX preference)
      localStorage.removeItem("pending_delivery_data");  // Let user restart
      router.replace("/main/delivery");
    } else {
      // For checkout, return to checkout (cart preserved)
      router.replace("/main/checkout");
    }
  };
  
  const handleFailure = () => {
    // Existing failure handler (network errors, etc.)
    toast.error("Payment verification failed. Please try again.");
    // ... existing code ...
  };
  
  // NEW: Route based on urlStatus
  if (urlStatus === "cancelled") {
    handleCancellation();  // NEW!
    return;
  }
  
  if (urlStatus && urlStatus !== "success") {
    handleFailure();
    return;
  }
  // ... rest of existing code ...
}, [searchParams, ...]);
```

**Benefits:**
- Explicit handling of cancellation
- Users receive clear messaging
- Proper state cleanup

---

### Solution 5: Delivery Page - Exit PAYMENT_PENDING on Cancellation

**Files to modify:** `web/customer-web-app/src/app/main/delivery/page.tsx`

In the recovery effect (around line 170):

```typescript
useEffect(() => {
  const recoverState = async () => {
    // ... existing code ...
    
    const currentStage = useDeliveryStore.getState().stage;
    const needsRecovery =
      currentStage === DeliveryStage.PAYMENT_PENDING ||
      currentStage === DeliveryStage.REVIEW_PAYMENT;

    if (!needsRecovery) return;

    try {
      const isVerified = await DeliveryService.verifyPayment(
        reference,
        gateway,
        token || undefined,
      );

      if (isVerified === true) {
        handlePaymentSuccess(id);
        return;
      }

      // NEW: Check if payment was cancelled (not just failed)
      const paymentRecord = await fetch(
        `${API_BASE}/payment/${reference}`,
        { headers: { Authorization: `Bearer ${token}` } }
      ).then(r => r.json());
      
      if (paymentRecord.status === "CANCELLED") {
        // NEW: Explicitly handle cancellation
        toast.warn("Payment was cancelled. You can retry when ready.");
        setStage(DeliveryStage.REVIEW_PAYMENT);  // Reset to payment review
        localStorage.removeItem("pending_delivery_data");
        return;
      }

      // Existing fallback polling...
      useDeliveryStore.setState({ activeDeliveryId: id });
      const success = await DeliveryService.pollDeliveryStatus(...);
      
      if (!success) {
        // NEW: Exit PAYMENT_PENDING if polling fails
        toast.error("Could not verify payment. Please check your payment status or try again.");
        setStage(DeliveryStage.REVIEW_PAYMENT);  // Reset to retry
      }
    } catch (e) {
      console.error("Failed to recover delivery state:", e);
      toast.warn("Payment status unclear. Returning to delivery form.");
      setStage(DeliveryStage.REVIEW_PAYMENT);  // Reset on error
      localStorage.removeItem("pending_delivery_data");
    }
  };

  recoverState();
}, [session, status, handlePaymentSuccess]);
```

**Benefits:**
- Exit PAYMENT_PENDING on both cancellation and unrecoverable errors
- Provides user feedback and clear next steps
- Allows retry without App restart

---

### Solution 6: Checkout Form - Reset isProcessing on Payment Failure

**Files to modify:** `web/customer-web-app/src/app/main/checkout/checkoutform.tsx`

Store orderCreation tracking & handle callback redirect:

```typescript
// After order creation
isOrderCreated.current = true;

// NEW: Store order info for recovery after callback
localStorage.setItem("pending_order_context", JSON.stringify({
  orderId: data.id || data.orderGroupId,
  total: data.total || data.grandTotal,
  timestamp: Date.now()
}));

// Redirect to payment
await processPayment(...);
```

Then add a recovery effect for when user returns from cancelled payment:

```typescript
// NEW: Detect and handle payment cancellation on checkout remount
useEffect(() => {
  const handleCancelledOrderRecovery = async () => {
    const orderContext = localStorage.getItem("pending_order_context");
    if (!orderContext) return;

    try {
      const { orderId, total, timestamp } = JSON.parse(orderContext);
      
      // Only consider it "cancelled" if returned within time window (5 minutes)
      if (Date.now() - timestamp > 5 * 60 * 1000) {
        localStorage.removeItem("pending_order_context");
        return;
      }

      // Check order status
      const token = session?.accessToken;
      if (!token) return;

      const orderRes = await fetch(`${API_URL}/users/orders/${orderId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      if (orderRes.ok) {
        const order = await orderRes.json();
        
        if (order.paymentStatus === "CANCELLED" || order.paymentStatus === "PENDING") {
          // Order exists but payment not confirmed
          toast.warn("Previous payment was cancelled. Please try again.");
          // Cart was NOT cleared, so items are still available for retry
        }
      }
      
      localStorage.removeItem("pending_order_context");
    } catch (err) {
      console.warn("Could not recover order context:", err);
      localStorage.removeItem("pending_order_context");
    }
  };

  if (status === "authenticated" && mounted) {
    handleCancelledOrderRecovery();
  }
}, [status, mounted, session?.accessToken]);
```

**Benefits:**
- Checkout form can detect and handle returned users
- Provides clear messaging
- Preserves cart for retry

---

## IMPLEMENTATION PRIORITY

1. **High Priority (Fixes Core Issue):**
   - Add CANCELLED status to enum
   - Update mapStatus function
   - Update callback to send "cancelled" status
   - Fix payment callback page to handle cancellation
   - Fix delivery recovery effect to exit PAYMENT_PENDING

2. **Medium Priority (Improves UX):**
   - Add cancellation detection in delivery recovery
   - Add order recovery effect in checkout form
   - Improve user messaging throughout

3. **Low Priority (Polish/Testing):**
   - Add comprehensive logs
   - Add edge case tests
   - Documentation updates

---

## TESTING STRATEGY

### Unit Tests
- PaystackService.mapStatus() correctly maps 'abandoned' → CANCELLED
- PaymentStatus enum includes CANCELLED variant

### Integration Tests
- Payment verification correctly identifies CANCELLED status
- Backend callback correctly routes with status=cancelled

### E2E Tests (Critical)
1. **Checkout cancellation:**
   - User places order → cart cleared  
   - Redirected to Paystack → cancels
   - Returned to /main/checkout in good state
   - Can retry immediately

2. **Delivery cancellation:**
   - User fills form → stage=REVIEW_PAYMENT
   - Clicks "Pay Securely" → stage=PAYMENT_PENDING
   - Cancelled at Paystack
   - Returned to /main/delivery, can access form again
   - Not stuck on spinner

3. **Multiple retries:**
   - Cancel → retry → cancel → retry should work
   - No duplicate orders created

4. **Slow network:**
   - Verify payment times out
   - Should gracefully exit PAYMENT_PENDING

5. **Session expiry:**
   - Session expires during Paystack redirect
   - User returned to sign-in
   - Can retry after signing in again

---

## DEPLOYMENT CHECKLIST

- [ ] Database migration: Add CANCELLED to enum
- [ ] Backend tests passing
- [ ] Backend deployment
- [ ] Frontend tests passing
- [ ] Frontend deployment
- [ ] Monitor payment callbacks for CANCELLED status tracking
- [ ] User feedback/verification

---

## CONCLUSION

The payment cancellation issue is caused by a multi-layered state management problem where no explicit distinction exists between user cancellation and technical failures. The fixes involve adding semantic clarity at the database level, propagating cancellation status through the backend callback, and implementing proper state recovery on the frontend.

The comprehensive solution ensures users are never stuck in processing states and always have clear paths to retry or recover from cancelled payments.
