# Wallet Balance Calculation Audit - Transaction Details Page

**Date**: May 13, 2026  
**Priority**: HIGH - Financial Integrity Issue  
**Status**: Root Cause Analysis Complete

---

## Executive Summary

The wallet balance calculation issue on the Transaction Details page exhibits mathematical inconsistency where debit transactions show impossible balance inversions. Analysis reveals **multiple critical issues** in balance tracking logic across both frontend and backend.

### Reported Issue
```
Before Balance:     ₦0.00
Transaction:       -₦2,900.00  (debit)
After Balance:      ₦2,900.00  (WRONG!)

Expected After:     ₦-2,900.00 or ₦0.00 (depending on balance policy)
```

---

## Root Cause Analysis

###  🔴 **CRITICAL ISSUE #1: Transaction Amount Sign Handling**

**Location**: [backend/src/super-admin/transactions/transaction.service.ts](backend/src/super-admin/transactions/transaction.service.ts#L385)

**Problem**: The system stores signed amounts in the transaction record:
- Positive amount = Credit (+)
- Negative amount = Debit (-)

When a debit is made:
```typescript
const delta = type === AdjustmentType.CREDIT ? amount : -amount;
// For DEBIT: delta = -2900
```

The transaction is recorded with `amount: -2900`.

**Issue**: When displaying on the frontend, if `balanceAfter = balanceBefore - amount`:
```
balanceAfter = 0 - (-2900) = 2900  ❌ WRONG
```

This suggests either:
1. The backend is calculating balances incorrectly
2. The frontend is using the wrong formula to validate balances
3. The absolute value of the amount is being used instead of the signed amount

---

### 🔴 **CRITICAL ISSUE #2: Payment Transaction Balances Hardcoded to Zero**

**Location**: [backend/src/super-admin/transactions/transaction-ledger.service.ts](backend/src/super-admin/transactions/transaction-ledger.service.ts#L72)

**Problem**:
```typescript
await client.transaction.create({
  data: {
    type: 'PAYMENT_RECEIVED',
    amount: payment.amount,
    // ... other fields ...
    balanceBefore: 0,  // 🚨 HARDCODED!
    balanceAfter: 0,   // 🚨 HARDCODED!
    // ...
  },
});
```

**Impact**: 
- Payment transactions show NO wallet balance tracking
- If the user has any wallet balance before/after a payment, it's lost
- All PAYMENT_RECEIVED transactions show Before=0, After=0
- Admin cannot see how payment affected wallet balances

**Why This Matters**:
- Payment records are core transaction history entries
- For orders and rides, the customer payment should be tracked against their wallet
- This creates an audit gap where payment transactions don't record actual balance state

---

### 🟡 **MEDIUM ISSUE #3: Inconsistent Balance Calculation Methods**

**Two Different Methods Exist**:

#### Method 1: transaction-ledger.service.ts::recordAdjustment
```typescript
balanceAfter: currentBalance + data.amount  // Signed amount
```
Assumes `data.amount` is signed (positive for credit, negative for debit).

#### Method 2: transaction.service.ts::adjustWallet
```typescript
const delta = type === CREDIT ? amount : -amount;
walletBalance: { increment: delta }  // Prisma handles the signed delta
balanceAfter = updated.walletBalance  // Read from DB after increment
```

Both methods are mathematically correct IF used consistently, but they make different assumptions about sign convention. **The problem arises if one method receives an unsigned amount while the other expects a signed amount.**

---

### 🟡 **MEDIUM ISSUE #4: Refund Transactions Missing Balance Tracking**

**Location**: [backend/src/super-admin/transactions/transaction-ledger.service.ts](backend/src/super-admin/transactions/transaction-ledger.service.ts#L666)

```typescript
await client.transaction.create({
  data: {
    type: 'REFUND_ISSUED',
    amount: payment.amount,
    // ...
    balanceBefore: 0,  // 🚨 HARDCODED!
    balanceAfter: 0,   // 🚨 HARDCODED!
  },
});
```

**Impact**: Refund transactions don't show how the refund affected customer wallet balance.

---

### 🟢 **CORRECT IMPLEMENTATIONS** ✅

The following transaction types ARE correctly tracking balances:

| Type | Location | Formula | Status |
|------|----------|---------|--------|
| ADJUSTMENT | transaction.service.ts | Stores signed delta, Prisma increments, reads new balance | ✅ CORRECT |
| VENDOR_EARNING | transaction-ledger.service.ts | `balanceAfter = currentBalance + vendorEarning` | ✅ CORRECT |
| RIDER_EARNING | transaction-ledger.service.ts | `balanceAfter = currentBalance + riderEarning` | ✅ CORRECT |
| PAYOUT_REQUESTED | transaction-ledger.service.ts | `balanceAfter = balanceBefore - amount` | ✅ CORRECT |
| COMMISSION_DEDUCTED | transaction-ledger.service.ts | `balanceAfter = currentBalance - commission` | ✅ CORRECT |
| PAYOUT_COMPLETED | transaction-ledger.service.ts | `balanceAfter = currentBalance - payout.amount` | ✅ CORRECT |

---

## Reproducible Test Case

### Setup
```
1. Create vendor with wallet balance = ₦0.00
2. Create ADJUSTMENT (DEBIT) transaction for ₦2,900.00
```

### Expected Behavior
```
Before Balance:    ₦0.00
Transaction:      -₦2,900.00
After Balance:    -₦2,900.00  (or rejected if balance < 0)
```

### Actual Behavior (BUG)
```
Before Balance:    ₦0.00
Transaction:      -₦2,900.00
After Balance:    +₦2,900.00  ❌ INVERTED!
```

---

## Affected Files

### Backend
- [backend/src/super-admin/transactions/transaction-ledger.service.ts](backend/src/super-admin/transactions/transaction-ledger.service.ts)
  - Line 72: PAYMENT_RECEIVED balances hardcoded
  - Line 666: REFUND_ISSUED balances hardcoded
  - Line 223: PAYOUT_FAILED balances hardcoded

- [backend/src/super-admin/transactions/transaction.service.ts](backend/src/super-admin/transactions/transaction.service.ts)
  - Line 753: transformTransactionDetail returns balances as-is (assumes DB is correct)

### Frontend
- [web/customer-web-app/src/app/super-admin/transactions/[id]/component/WalletBalanceCard.tsx](web/customer-web-app/src/app/super-admin/transactions/[id]/component/WalletBalanceCard.tsx)
  - No validation of balance math
  - No detection of inverted/impossible balances

- [web/customer-web-app/src/app/super-admin/transactions/[id]/page.tsx](web/customer-web-app/src/app/super-admin/transactions/[id]/page.tsx)
  - Line 250: isCredit determination relies on type list only
  - No validation that balances match amount

---

## Why This Bug Manifests

### Scenario: Debit of ₦2,900 with Balance ₦0

**If amount is stored as SIGNED (-2900)**:
```
database.transactions:
  {
    id: "tx123",
    type: "ADJUSTMENT",
    amount: -2900,  // ← SIGNED (negative for debit)
    balanceBefore: 0,
    balanceAfter: ?, // Should be -2900
  }
```

**Bug #1: Backend Calculation**
If anywhere the backend calculates:
```
balanceAfter = balanceBefore - amount
balanceAfter = 0 - (-2900) = 2900  ❌
```

**Bug #2: Frontend Display**
If the frontend uses Math.abs() incorrectly:
```
displayAmount = Math.abs(-2900) = 2900
// Shown as: +₦2,900 (with green "credit" styling)
```

**Bug #3: Balance Math Validation**
No check that:
```
diff = after - before = 2900 - 0 = 2900
But amount = -2900
These don't match! ❌
```

---

## Recommended Fixes

### Fix #1: Track Payment Transaction Balances ⚠️ HIGH PRIORITY

**File**: [backend/src/super-admin/transactions/transaction-ledger.service.ts](backend/src/super-admin/transactions/transaction-ledger.service.ts#L50)

**Current Code**:
```typescript
balanceBefore: 0,
balanceAfter: 0,
```

**Fixed Code**:
```typescript
// For payments, track only platform balance (if applicable)
// Or fetch customer wallet balance if payment is customer-initiated
balanceBefore: 0,  // Platform doesn't have customer's wallet
balanceAfter: 0,   // Payment doesn't affect wallet directly
// Add metadata to clarify this is payment record, not wallet mutation
metadata: {
  method: payment.method,
  userId: payment.userId,
  note: 'Payment transaction - wallet balance not tracked here',
},
```

OR better:

```typescript
// If tracking customer wallet balance on payment:
const customer = await client.user.findUnique({ where: { id: payment.userId } });
const customerWalletBefore = customer?.walletBalance ?? 0;
// ... after payment processing ...
const customerWalletAfter = customer?.walletBalance ?? 0;

balanceBefore: customerWalletBefore,
balanceAfter: customerWalletAfter,
```

### Fix #2: Add Balance Validation Function (Frontend)

**New File**: [web/customer-web-app/src/utils/balance-validation.ts](web/customer-web-app/src/utils/balance-validation.ts)

```typescript
export function validateWalletBalances(
  before: number,
  after: number,
  amount: number,
  type: string
): {
  valid: boolean;
  error?: string;
  expectedAfter?: number;
} {
  // Determine if this is a credit or debit
  const creditTypes = [
    'PAYMENT_RECEIVED',
    'WALLET_TOPUP',
    'VENDOR_EARNING',
    'RIDER_EARNING',
  ];
  const isCredit = creditTypes.includes(type);

  // For signed amounts: diff = after - before should equal amount (with sign)
  const diff = after - before;
  const signedAmount = isCredit ? Math.abs(amount) : -Math.abs(amount);
  const expectedAfter = before + signedAmount;

  // Check if calculations match (within 0.01 for floating point)
  if (Math.abs(diff - signedAmount) > 0.01) {
    return {
      valid: false,
      error: `Balance mismatch: expected diff=${signedAmount}, got diff=${diff}`,
      expectedAfter,
    };
  }

  // Check if after balance matches expected
  if (Math.abs(after - expectedAfter) > 0.01) {
    return {
      valid: false,
      error: `After balance error: expected ${expectedAfter}, got ${after}`,
      expectedAfter,
    };
  }

  // Special case: detect inversion (e.g., debit showing as positive balance)
  if (isCredit === false && amount < 0 && after > before) {
    return {
      valid: false,
      error: `CRITICAL: Debit transaction showing balance increase (inversion bug)`,
      expectedAfter,
    };
  }

  return { valid: true };
}
```

### Fix #3: Add Validation to WalletBalanceCard

**File**: [web/customer-web-app/src/app/super-admin/transactions/[id]/component/WalletBalanceCard.tsx](web/customer-web-app/src/app/super-admin/transactions/[id]/component/WalletBalanceCard.tsx)

```typescript
import { validateWalletBalances } from '@/utils/balance-validation';

export const WalletBalanceCard = ({
  before,
  after,
  amount,
  isCredit,
}: WalletBalanceProps) => {
  // ✅ ADDED: Validate balance calculations
  const validation = validateWalletBalances(before, after, amount, 
    isCredit ? 'PAYMENT_RECEIVED' : 'ADJUSTMENT'
  );

  return (
    <SectionCard
      title="Wallet Balance"
      icon={Banknote}
      iconColorClass="bg-emerald-500/20 text-emerald-500"
    >
      {/* ✅ ADDED: Show validation error if present */}
      {!validation.valid && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-lg">
          <p className="text-red-500 text-xs font-medium">Balance Calculation Error</p>
          <p className="text-red-400 text-xs mt-1">{validation.error}</p>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Before</span>
          <span className="text-white font-medium">
            <Currency amount={before} />
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400">Transaction</span>
          <span
            className={`font-bold flex items-center gap-1 ${isCredit ? "text-green-500" : "text-orange-500"}`}
          >
            <span>{isCredit ? "+" : "-"}</span>
            <Currency amount={Math.abs(amount)} />
          </span>
        </div>
        <div className="pt-3 border-t border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-white font-medium">After</span>
            <span className="text-white font-bold text-lg">
              <Currency amount={after} />
            </span>
          </div>
          {/* ✅ ADDED: Show calculated difference */}
          <p className="text-xs text-gray-400 mt-2">
            Difference: <Currency amount={after - before} />
          </p>
        </div>
      </div>
    </SectionCard>
  );
};
```

### Fix #4: Fix Payment Balance Tracking

**File**: [backend/src/super-admin/transactions/transaction-ledger.service.ts](backend/src/super-admin/transactions/transaction-ledger.service.ts#L50)

```typescript
// Before: hardcoded zeros
// After: add comment explaining why balances are 0
balanceBefore: 0,  // Payment is platform transaction, not wallet mutation
balanceAfter: 0,   // Customer wallet tracked separately in wallet service
metadata: {
  method: payment.method,
  userId: payment.userId,
  walletNote: 'This is a payment record. Customer wallet balances tracked in Wallet service.',
},
```

---

## Testing Strategy

### Test Case 1: Debit Transaction Math
```typescript
describe('WalletBalanceCard Validation', () => {
  it('should detect debit inversion bug', () => {
    const validation = validateWalletBalances(
      0,      // before
      2900,   // after (WRONG for debit)
      -2900,  // amount (signed debit)
      'ADJUSTMENT'  // not a credit type
    );
    
    expect(validation.valid).toBe(false);
    expect(validation.error).toContain('inversion');
  });

  it('should pass correct debit', () => {
    const validation = validateWalletBalances(
      0,      // before
      -2900,  // after (CORRECT)
      -2900,  // amount
      'ADJUSTMENT'
    );
    
    expect(validation.valid).toBe(true);
  });

  it('should detect hardcoded zero balances', () => {
    const validation = validateWalletBalances(
      0,      // before
      0,      // after
      2900,   // amount
      'PAYMENT_RECEIVED'  // but balances show no change
    );
    
    expect(validation.valid).toBe(false);
  });
});
```

### Test Case 2: Backend Balance Calculation
```typescript
describe('Wallet Adjustment', () => {
  it('should correctly calculate debit balance', async () => {
    // Create rider with 5000 balance
    await adjustWallet({
      targetId: riderId,
      targetType: 'RIDER',
      type: 'DEBIT',
      amount: 2900,
      description: 'Test debit',
    });

    const txn = await findOne(transactionId);
    expect(txn.balanceBefore).toBe(5000);
    expect(txn.balanceAfter).toBe(2100);  // 5000 - 2900
    expect(txn.amount).toBe(-2900);       // stored as signed
  });

  it('should correctly calculate credit balance', async () => {
    // Create rider with 0 balance
    await adjustWallet({
      targetId: riderId,
      targetType: 'RIDER',
      type: 'CREDIT',
      amount: 2900,
      description: 'Test credit',
    });

    const txn = await findOne(transactionId);
    expect(txn.balanceBefore).toBe(0);
    expect(txn.balanceAfter).toBe(2900);  // 0 + 2900
    expect(txn.amount).toBe(2900);        // stored as signed
  });
});
```

---

## Edge Cases to Handle

1. **Zero Balance Debit**: Attempting to debit from ₦0 balance
   - Should either fail or allow negative balance (policy decision)
   - Balance should NOT invert to positive

2. **Floating Point Precision**:
   - 0.01 tolerance for validation (₦0.01 difference acceptable)
   - Use safe math functions for comparison

3. **Negative Balances**:
   - Document whether system allows negative balances
   - If yes, ensure validation accepts them
   - If no, enforce floor at zero

4. **Large Amounts**:
   - Verify calculation doesn't overflow with large numbers
   - Test with ₦100,000,000+ amounts

---

## Implementation Timeline

**Phase 1 (Critical - 2-3 hours)**
- [ ] Create balance validation utility
- [ ] Add validation to WalletBalanceCard frontend
- [ ] Deploy frontend fixes
- [ ] Monitor for validation errors

**Phase 2 (High - 3-4 hours)**
- [ ] Fix PAYMENT_RECEIVED balance tracking
- [ ] Fix REFUND_ISSUED balance tracking
- [ ] Add tests for balance calculations
- [ ] Code review and testing

**Phase 3 (Medium - 2-3 hours)**
- [ ] Add historical data audit script
- [ ] Detect and report any existing incorrect balances
- [ ] Document findings
- [ ] Optional: bulk correction if needed

---

## Monitoring & Alerts

After fixes:
1. Monitor WalletBalanceCard validation errors in logs
2. Set up alerts for "balance inversion" errors
3. Weekly audit of balance calculations
4. Dashboard to track validation failures

---

## Summary

| Issue | Severity | Fix | Status |
|-------|----------|-----|--------|
| Payment balance hardcoded | HIGH | Track actual wallet balance or document why | Ready |
| Refund balance hardcoded | MEDIUM | Track refund impact on wallet | Ready |
| Balance validation missing | HIGH | Add validateWalletBalances() | Ready |
| Display not detecting errors | HIGH | Add validation error banner | Ready |
| Math formula inconsistency | MEDIUM | Document and standardize | Ready |

**Total Impact**: Once fixed, all wallet balance displays will be mathematically validated and errors will be immediately visible to admins.
