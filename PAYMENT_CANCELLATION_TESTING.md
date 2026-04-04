# Payment Cancellation Fix - Testing & Validation Framework

**Document Status:** Implementation Complete  
**Testing Phase:** Ready for Execution  
**Date:** April 1, 2026

---

## CHANGES IMPLEMENTED

### Backend Changes

#### 1. **Database Schema** (`backend/prisma/schema.prisma`)
```diff
enum PaymentStatus {
  PENDING
  COMPLETED
  FAILED
+ CANCELLED              // NEW: Explicit user cancellation status
  REFUNDED
  PARTIALLY_REFUNDED
}
```

#### 2. **Paystack Service** (`backend/src/payment/paystack.service.ts`)
```typescript
// CHANGED: Map 'abandoned' → CANCELLED (not FAILED)
case 'abandoned':
  return PaymentStatus.CANCELLED;  // ✅ NEW
```

#### 3. **Payment Controller** (`backend/src/payment/payment.controller.ts`)
```typescript
// CHANGED: Send explicit 'cancelled' status for CANCELLED payments
let statusParam: string;
if (verification.status === PaymentStatus.COMPLETED) {
  statusParam = 'success';
} else if (verification.status === PaymentStatus.CANCELLED) {
  statusParam = 'cancelled';  // ✅ NEW signal
} else {
  statusParam = 'failed';
}
```

### Frontend Changes

#### 1. **Payment Callback** (`web/customer-web-app/src/app/payment/callback/page.tsx`)
- ✅ NEW: `handleCancellation()` function for explicit cancellation handling
- ✅ NEW: Route on `urlStatus === "cancelled"`
- ✅ FIXED: Proper state cleanup and messaging for each flow

#### 2. **Delivery Page** (`web/customer-web-app/src/app/main/delivery/page.tsx`)
- ✅ NEW: `getPaymentStatus()` call to detect CANCELLED status
- ✅ FIXED: Exit `PAYMENT_PENDING` state on cancellation
- ✅ FIXED: Exit `PAYMENT_PENDING` state on recovery errors (prevents infinite loop)
- ✅ FIXED: Proper user messaging on different failure types

#### 3. **Delivery Service** (`web/customer-web-app/src/services/delivery.service.ts`)
- ✅ NEW: `getPaymentStatus()` method to fetch full payment details

#### 4. **Checkout Form** (`web/customer-web-app/src/app/main/checkout/checkoutform.tsx`)
- ✅ NEW: Recovery effect to detect cancelled orders on remount
- ✅ FIXED: Proper messaging about cancelled/failed orders

---

## TESTING MATRIX

### Phase 1: Unit Tests

#### Test 1.1: PaystackService.mapStatus()
```typescript
describe('PaystackService.mapStatus', () => {
  it('maps success → COMPLETED', () => {
    expect(mapStatus('success')).toBe(PaymentStatus.COMPLETED);
  });

  it('maps failed → FAILED', () => {
    expect(mapStatus('failed')).toBe(PaymentStatus.FAILED);
  });

  it('maps abandoned → CANCELLED', () => {  // ✅ NEW TEST
    expect(mapStatus('abandoned')).toBe(PaymentStatus.CANCELLED);
  });

  it('maps unknown → PENDING', () => {
    expect(mapStatus('unknown')).toBe(PaymentStatus.PENDING);
  });
});
```

**Expected Result:** All tests pass

---

#### Test 1.2: PaymentController.paystackCallback()
```typescript
describe('PaymentController.paystackCallback', () => {
  it('redirects with status=success for COMPLETED payments', () => {
    // Mock verification to return COMPLETED
    // Assert redirect includes ?status=success
  });

  it('redirects with status=cancelled for CANCELLED payments', () => {  // ✅ NEW TEST
    // Mock verification to return CANCELLED
    // Assert redirect includes ?status=cancelled
  });

  it('redirects with status=failed for FAILED payments', () => {
    // Mock verification to return FAILED
    // Assert redirect includes ?status=failed
  });
});
```

**Expected Result:** All tests pass, callback correctly signals cancellation

---

### Phase 2: Integration Tests

#### Test 2.1: Payment Verification with Cancellation
```
Scenario: User cancels at Paystack, backend verifies as abandoned

Steps:
1. POST /payment/initialize → receive reference + authUrl
2. Simulate Paystack receiving user cancellation → updates transaction to abandoned
3. GET /payment/callback/paystack?reference=XXX
4. Backend verifies with Paystack API
5. Assert: Paystack returns status='abandoned'
6. Assert: Backend maps to PaymentStatus.CANCELLED
7. Assert: Redirect includes ?status=cancelled
```

**Expected Result:** Payment marked CANCELLED in database, redirect has correct status

---

#### Test 2.2: Frontend Payment Callback Routing
```
Scenario: Frontend receives ?status=cancelled from backend

Setup: Create test payment with CANCELLED status
1. Manual browser navigation to /payment/callback?reference=REF&status=cancelled
2. Frontend handleCancellation() should execute
3. Assert: localStorage.pending_delivery_data is cleared
4. Assert: "Payment cancelled" toast shown
5. Assert: Redirected to /main/delivery
```

**Expected Result:** proper flow and messaging, no stuck states

---

#### Test 2.3: Delivery Recovery with Failed Verification
```
Scenario: User returns from cancelled payment, recovery effect runs

Setup:
1. localStorage has pending_delivery_data with cancelled reference
2. Delivery page loads
3. Recovery effect runs:
   - Tries verifyPayment() → returns false (cancelled)
   - Calls getPaymentStatus() → status = CANCELLED
   - Detects CANCELLED and exits PAYMENT_PENDING

Assert:
1. Stage reset to REVIEW_PAYMENT (not stuck on PAYMENT_PENDING)
2. "Payment was cancelled" toast shown
3. User can see payment review form again
4. localStorage.pending_delivery_data cleared
```

**Expected Result:** User not stuck, can see form and retry

---

### Phase 3: End-to-End Tests

#### Test 3.1: Checkout → Cancel → Retry Cycle
```
Narrative: Complete checkout flow with cancellation and retry

Steps:
1. Customer adds items to cart
2. Navigates to /main/checkout
3. Fills in address, phone number
4. Clicks "Place Order"
   → Order created
   → isProcessing = true
   → Redirected to Paystack
5. [AT PAYSTACK]
   → Customer cancels/abandons payment
   → Paystack shows cancellation (does NOT complete transaction)
6. [BROWSER RETURNS]
   → GET /payment/callback?reference=REF&status=cancelled
   → Frontend detects cancellation
   → Shows "Payment cancelled. You can try again"
   → Redirects to /main/checkout
7. Checkout form reloads:
   → Cart items still present
   → Address still selected
   → Phone still filled
   → Form is ready for retry
8. Customer clicks "Place Order" again
   → Initiates new payment
   → Completes successfully

Assertions:
✓ No error messages about stuck payment
✓ Cart preserved after cancellation
✓ User can immediately retry
✓ No duplicate orders created
✓ Final order tracks first cancelled attempt + successful second attempt
```

**Expected Result:** Seamless retry without data loss

---

#### Test 3.2: Delivery → Cancel → Recovery → Retry
```
Narrative: Delivery form with cancellation detection on remount

Steps:
1. Customer fills delivery form (addresses, phone, package info)
2. Sees calculated fee
3. Clicks "Pay Securely"
   → setStage(PAYMENT_PENDING)
   → Shows spinner "Processing Payment"
   → Redirected to Paystack
4. [AT PAYSTACK]
   → Customer cancels
5. [BROWSER RETURNS]
   → GET /payment/callback?reference=REF&status=cancelled
   → handleFailure() for delivery flow
   → Does NOT call resetDelivery()
   → Redirects to /main/delivery
6. Delivery page reloads:
   → Recovery effect triggers
   → Detects localStorage.pending_delivery_data
   → Calls verifyPayment() → false (was cancelled)
   → Calls getPaymentStatus() → status = CANCELLED
   → Resets stage to REVIEW_PAYMENT
   → Shows toast "Payment was cancelled. You can start a new delivery or use this form again"
7. Spinner disappears, user sees payment review UI again
8. Form data is preserved:
   → Addresses still filled
   → Package info still filled
   → Fee still visible
9. Customer retries payment
   → Payment succeeds
   → handlePaymentSuccess() triggers
   → Stage progresses through ASSIGNED → PICKED_UP → DELIVERED

Assertions:
✓ Not stuck on spinner
✓ User sees appropriate message
✓ Form data preserved for retry
✓ Can complete delivery after retry
✓ No duplicate deliveries created
```

**Expected Result:** Recovery from cancellation, successful retry

---

#### Test 3.3: Multiple Cancellations
```
Narrative: User cancels multiple times before successful payment

Steps:
1. Delivery form → Pay Securely → Cancel at Paystack (1st time)
   → Recovery detects cancellation → resets to REVIEW_PAYMENT ✓
2. Retry payment → Cancel at Paystack (2nd time)
   → Recovery detects 2nd cancellation → resets to REVIEW_PAYMENT ✓
3. Retry payment → Cancel at Paystack (3rd time)
   → Recovery detects 3rd cancellation → resets to REVIEW_PAYMENT ✓
4. Retry payment → COMPLETES successfully
   → handlePaymentSuccess() triggers
   → Delivery progresses normally ✓

Assertions:
✓ Each cancellation properly detected
✓ No data corruption from repeated cancellations
✓ Successful payment works after multiple retries
✓ Single delivery created (not duplicated)
```

**Expected Result:** Robust handling of repeated cancellations

---

### Phase 4: Edge Case Tests

#### Test 4.1: Slow Network Response
```
Scenario: Network timeout during recovery verification

Steps:
1. User cancels → redirected back to /main/delivery
2. Recovery effect starts:
   - Calls verifyPayment() with 10 second timeout
   - Network is slow, request hangs > timeout
3. Fetch aborts/times out
4. Exception caught → stage reset to REVIEW_PAYMENT
5. User sees "Payment status unclear. Returning to delivery form to retry"

Expected:
✓ Not stuck on PAYMENT_PENDING
✓ User can retry from form
✓ No orphaned state
```

---

#### Test 4.2: Delayed Webhook After Cancellation
```
Scenario: Webhook arrives after user has already been redirected

Timeline:
T1: User cancels at Paystack (abandoned)
T2: Frontend redirected to callback with status=cancelled
T3: User reset to REVIEW_PAYMENT, ready to retry
T4: Webhook arrives from Paystack (delayed)
T5: Backend updates Payment record to CANCELLED
T6: But user has already moved on (form is visible)

Expected:
✓ Eventual consistency — webhook correctly marks CANCELLED
✓ No race condition causing unexpected state changes
✓ If user tries payment again, fresh request created
```

---

#### Test 4.3: Session Expiry During Recovery
```
Scenario: User's session expires while recovery effect runs

Steps:
1. User cancels payment
2. Redirected to /main/delivery
3. Recovery effect starts:
   - Calls verifyPayment() with expired token
   - Backend returns 401 Unauthorized
4. Exception caught
5. Stage reset to REVIEW_PAYMENT
6. User asked to re-authenticate

Expected:
✓ Graceful degradation
✓ No crash on 401
✓ User prompted to log in again
✓ Can retry after re-authentication
```

---

#### Test 4.4: Browser Back Button After Cancellation
```
Scenario: User clicks browser back button after cancellation

Steps:
1. Payment initiated, user at Paystack
2. User cancels, browser shows callback page with spinner
3. User clicks browser back button
4. Returns to delivery form (state may be stale)
5. Page re-renders with persisted state from localStorage
6. Recovery effect runs again
   - Detects pending_delivery_data
   - Tries to verify (already verified as cancelled once)
   - Should handle gracefully

Expected:
✓ No duplicate verification calls
✓ Proper state even on repeated loads
✓ User can proceed normally
```

---

#### Test 4.5: Tab Switching During Payment
```
Scenario: User switches tabs during payment process

Steps:
1. Tab A: Delivery form, click "Pay Securely"
2. User navigates to Tab B (other app/website)
3. Tab A still has Paystack open, user cancels there
4. Tab A receives callback, sets stage=REVIEW_PAYMENT
5. Hours later, user returns to Tab B then Tab A
6. Tab A storage has stale pending_delivery_data from cancelled payment
7. Recovery effect runs

Expected:
✓ Properly detects cancellation even with delay
✓ Resets state correctly
✓ No data corruption
```

---

### Phase 5: Regression Tests (Ensure No Breakage)

#### Test 5.1: Successful Payment Still Works
```
Narrative: Verify successful payment flow not broken

Steps:
1. Delivery form → Pay Securely
2. Complete payment successfully at Paystack
3. Backend callback receives ?status=success
4. Frontend calls handleSuccess()
5. Stage progresses through delivery states normally

Assertions:
✓ PAYMENT_PENDING → REQUESTED → ASSIGNED → ... → DELIVERED
✓ No unexpected resets
✓ Payment confirmed properly
```

---

#### Test 5.2: Network Failures (Not Cancellations)
```
Narrative: Ensure network errors still handled correctly

Steps:
1. Delivery form → Pay Securely
2. Network error occurs (no connection to Paystack)
3. Backend callback returns error
4. Frontend receives ?status=failed
5. handleFailure() triggers (not handleCancellation)
6. Message: "Payment verification failed. Please try again."
7. Stage reset to REVIEW_PAYMENT
8. User can retry

Assertions:
✓ Network errors properly distinguished from cancellations
✓ Appropriate error message shown
✓ Recovery flow works for network errors too
```

---

#### Test 5.3: Admin Cancel vs User Cancel
```
Narrative: Ensure only user cancellations map to CANCELLED status

Scenarios:
a) User cancels at Paystack (abandoned) → CANCELLED ✓
b) Admin cancels in dashboard → Different flow (not tested here)
c) API rejects payment (fraud detection) → FAILED ✓
d) Card declined → FAILED ✓

Expected:
✓ Only Paystack 'abandoned' status → CANCELLED
✓ Other failures → FAILED
```

---

## VALIDATION CHECKLIST

### Pre-Deployment
- [ ] All unit tests passing
- [ ] All integration tests passing
- [ ] Database migration tested (add CANCELLED to enum)
- [ ] No TypeScript compilation errors
- [ ] PaymentStatus enum correctly imported/used everywhere
- [ ] Backend generates migration script (Prisma)
- [ ] Frontend and backend versions compatible

### Post-Deployment (Staging)
- [ ] Manual test 3.1: Checkout cancellation + retry on staging
- [ ] Manual test 3.2: Delivery cancellation + retry on staging
- [ ] Manual test 3.3: Multiple cancellations on staging
- [ ] Monitor logs for any payment status anomalies
- [ ] Verify database has CANCELLED records after staging tests

### Production Rollout
- [ ] Blue-green deployment plan in place
- [ ] Rollback procedure documented
- [ ] Monitoring alerts for payment cancellation spike
- [ ] Support team briefed on changes
- [ ] Customer communication (if needed)

### Post-Production (Monitoring)
- [ ] Track CANCELLED payment rates (should be < failed rate)
- [ ] Monitor user retry rates (should decrease)
- [ ] Check for any orphaned PAYMENT_PENDING states
- [ ] Review user feedback/support tickets for stuck payments
- [ ] Collect metrics: cancellation recovery success rate

---

## METRICS TO TRACK

### Success Indicators (Should improve)
1. **Reduce "Stuck on Processing Payment" Reports**
   - Before: X% of users report stuck state
   - After: Should approach 0%

2. **Increase Successful Retry Rate**
   - Before: Users abandon after cancellation
   - After: Users can retry successfully

3. **Reduce Support Tickets**
   - Before: "App is frozen" complaints
   - After: Fewer stuck payment complaints

### Performance Metrics (Should not degrade)
1. **Callback processing time** - Should remain < 500ms
2. **Recovery effect execution time** - Should be < 2 seconds
3. **Payment verification success rate** - Should not decrease

### Data Quality Metrics
1. **CANCELLED status usage** - Track if mapping works
2. **Duplicate order prevention** - Verify idempotency works
3. **State consistency** - No cases of contradictory states

---

## KNOWN LIMITATIONS & FUTURE IMPROVEMENTS

### Current Scope
- Handles Paystack cancellation only (abandoned status)
- Delivery and Checkout flows covered
- Single cancellation handling

### Not Covered in This Fix
- [ ] Ride payment cancellation (different flow, lower priority)
- [ ] Other payment gateways (Flutterwave, Monnify) - future
- [ ] Admin cancellation vs user cancellation distinction - future
- [ ] Webhook retry logic if delayed - future
- [ ] Automatic retry mechanism - future

### Future Enhancements
1. **Proactive Retry**: Auto-retry failed payments after delay
2. **Payment Analytics**: Better tracking of cancellation patterns
3. **User Entitlements**: Offer incentives for completed retry
4. **Fallback Methods**: Auto-retry with saved card if available
5. **Webhook Resilience**: Improve webhook handling for late arrivals

---

## DEPLOYMENT STEPS

### 1. Database Migration
```bash
# Generate migration
cd backend
npx prisma migrate dev --name add_cancelled_payment_status

# Or for production:
npx prisma migrate deploy
```

### 2. Backend Deployment
```bash
# Build and push
npm run build
docker build -t backend:vX.X.X .
docker push your-registry/backend:vX.X.X

# Deploy (verify Prisma schema updated first)
kubectl set image deployment/backend backend=your-registry/backend:vX.X.X
```

### 3. Frontend Deployment
```bash
# No database changes on frontend, so can deploy independently
npm run build
npm run export  # Or your build process

# Deploy to CDN/hosting
# (Standard Next.js deployment)
```

### 4. Verification in Production
```bash
# Check database
SELECT COUNT(*) FROM "Payment" WHERE status = 'CANCELLED';

# Monitor logs
tail -f /var/log/backend/app.log | grep -i CANCELLED

# Check metrics
curl http://backend/health/payment-status-distribution
```

---

## ROLLBACK PROCEDURE

If issues occur:

### Quick Rollback (No Database Rollback)
```bash
# Revert payment controller callback logic
git revert <commit>
docker build -t backend:rollback .
kubectl set image deployment/backend backend=your-registry/backend:rollback
```

### Full Rollback (Including Database)
```bash
# Only if CANCELLED status causes data corruption
npx prisma migrate resolve --rolled-back <migration_name>
npx prisma db push  # Back to previous schema
```

---

## CONCLUSION

This comprehensive testing framework ensures:
1. The payment cancellation issue is fully resolved
2. Users are never stuck on "Processing Payment" state
3. Cancellations are explicitly handled vs other failures
4. Recovery is automatic and transparent
5. No regression in existing payment flows
6. Production deployment is safe and monitored

Test execution should proceed through all phases, with escalation to production only after phase 3 (E2E) all pass.
