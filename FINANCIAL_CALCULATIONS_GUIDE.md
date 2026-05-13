# Financial Calculations - Developer Guide

## Overview

This guide explains how to perform safe financial calculations throughout the asoose application, with special attention to the Transactions and Transaction Details audit findings.

## Quick Start

### Import Financial Utilities

```typescript
import {
  safeAdd,
  safeSubtract,
  safePercent,
  validateOrderFinancialBreakdown,
  validateWalletBalanceChange,
} from '@/utils/financial';
```

### Common Patterns

#### Order Commission Calculation

```typescript
// ✅ CORRECT PATTERN
const subtotal = 1000;
const commissionRate = 10;

const commission = safePercent(subtotal, commissionRate);
const vendorReceives = safeSubtract(subtotal, commission);

// ❌ WRONG PATTERNS TO AVOID
const wrongVendorReceives = safeAdd(subtotal, commission); // Uses addition!
const wrongVendorReceives2 = subtotal - (subtotal * commissionRate); // Doesn't use helper
```

#### Wallet Balance Update

```typescript
// ✅ CORRECT PATTERN
const currentBalance = 10000;
const transactionAmount = 500;
const type = 'CREDIT'; // or 'DEBIT'

const newBalance = type === 'CREDIT'
  ? safeAdd(currentBalance, transactionAmount)
  : safeSubtract(currentBalance, transactionAmount);

// Validate the calculation
const validation = validateWalletBalanceChange({
  balanceBefore: currentBalance,
  balanceAfter: newBalance,
  transactionAmount,
  isCredit: type === 'CREDIT',
});

if (!validation.valid) {
  console.error('Balance calculation error:', validation.message);
}
```

---

## Detailed API Reference

### `safeAdd(a: number, b: number): number`

Safely adds two amounts without floating-point precision errors.

```typescript
// Examples
safeAdd(0.1, 0.2)        // 0.3 (not 0.30000000000000004)
safeAdd(100, 50)         // 150
safeAdd(100.50, 50.25)   // 150.75
```

**When to use**: When combining two amounts (totals, subtotals)

---

### `safeSubtract(a: number, b: number): number`

Safely subtracts one amount from another. **CRITICAL for vendor earnings calculation.**

```typescript
// Examples
safeSubtract(100, 50)              // 50
safeSubtract(43367.50, 2137.50)    // 41230.00 (not 45505.00!)
safeSubtract(0.3, 0.1)             // 0.2
```

**When to use**: 
- Calculating vendor receives (subtotal - commission)
- Wallet debits
- Refunds and deductions

**CRITICAL**: This is where the reported bug likely exists. Never use addition for debit/deduction operations!

---

### `safePercent(amount: number, percentageRate: number): number`

Calculates a percentage of an amount.

```typescript
// Examples
safePercent(1000, 5)     // 50 (5% of 1000)
safePercent(1000, 10)    // 100
safePercent(43367.50, 5) // 2168.38

// Commission calculation
const commission = safePercent(subtotal, commissionRate);
```

**When to use**: Commission calculations, tax calculations, fee deductions

---

### `safePercentageDeduction(baseAmount: number, deductionPercentage: number): number`

Calculates the remaining amount after a percentage deduction. Combines safePercent and safeSubtract.

```typescript
// Examples
safePercentageDeduction(100, 10)      // 90 (100 - 10%)
safePercentageDeduction(1000, 5)      // 950
safePercentageDeduction(43367.50, 5)  // 41199.13

// Equivalent to:
// const commission = safePercent(43367.50, 5); // 2168.38
// const result = safeSubtract(43367.50, 2168.38); // 41199.13
```

**When to use**: When you want to calculate the result directly without intermediate step

---

### `isValidAmount(amount: unknown): amount is number`

Type-safe validation that an amount is a valid financial number.

```typescript
// Valid amounts
isValidAmount(100)        // true
isValidAmount(100.50)     // true
isValidAmount(0.01)       // true

// Invalid amounts
isValidAmount('100')      // false (string)
isValidAmount(NaN)        // false
isValidAmount(Infinity)   // false
isValidAmount(-100)       // false
isValidAmount(100.555)    // false (3 decimals)
```

**When to use**: Validate user input or API responses before processing

---

### `formatAmountTo2Decimals(amount: number): number`

Formats any number to exactly 2 decimal places.

```typescript
formatAmountTo2Decimals(100)      // 100.00
formatAmountTo2Decimals(100.555)  // 100.56 (rounded)
formatAmountTo2Decimals(100.5)    // 100.50
```

**When to use**: Before storing amounts or comparing values

---

### `validateOrderFinancialBreakdown(breakdown: {...}): {valid: boolean; errors: string[]}`

**CRITICAL FUNCTION** - Validates entire order financial calculation to detect bugs.

```typescript
const breakdown = {
  subtotal: 43367.50,
  commissionRate: 5,
  commissionAmount: 2168.38,
  vendorReceives: 41199.13, // Should be subtotal - commission
};

const result = validateOrderFinancialBreakdown(breakdown);

if (!result.valid) {
  console.error('Financial errors:', result.errors);
  // Will detect:
  // - Commission calculation errors
  // - Addition vs subtraction bugs
  // - Vendor receives mismatch
}
```

**Returns**: 
- `valid`: true if all calculations correct
- `errors`: array of detailed error messages
- `expectedValues`: if errors found, shows correct values

**When to use**: 
- Before saving order transactions
- In API responses for transaction details
- During order financial breakdown calculation

---

### `validateWalletBalanceChange(params: {...}): {valid: boolean; ...}`

Validates wallet balance updates to detect calculation errors.

```typescript
const validation = validateWalletBalanceChange({
  balanceBefore: 10000,
  balanceAfter: 10500,    // Should be 10500
  transactionAmount: 500,
  isCredit: true,         // Adding money
});

if (!validation.valid) {
  console.error('Balance mismatch:', validation.message);
  console.error('Expected:', validation.expectedBalance);
  console.error('Discrepancy:', validation.discrepancy);
}
```

**Detects**:
- Addition used instead of subtraction (the reported bug!)
- Incorrect balance updates
- Precision errors > 0.01

**When to use**: 
- After wallet adjustment operations
- Validating transaction records
- Debugging balance discrepancies

---

## Backend Implementation Guide

### 1. Order Financial Breakdown (transaction.service.ts)

**CURRENT CODE (VERIFY THIS IS CORRECT)**:

```typescript
private transformTransactionDetail(t: any) {
  // ... other code ...
  
  if (t.payment.order) {
    const order = t.payment.order;
    const subtotal = order.items.reduce(
      (sum, i) => sum + i.quantity * i.price,
      0,
    );
    const commission = subtotal * (order.store.commissionRate / 100);
    const deliveryFee = order.delivery?.deliveryFee || 0;

    detail.orderDetails = {
      // ...
      subtotal,
      deliveryFee,
      total: order.total,
    };

    // ✅ THIS MUST USE SUBTRACTION, NOT ADDITION
    detail.financialBreakdown = {
      customerPaid: order.total,
      platformCommission: commission,
      deliveryFee,
      vendorReceives: subtotal - commission,  // ✅ CORRECT
      // vendorReceives: subtotal + commission,  // ❌ WRONG (THE BUG)
    };
  }
}
```

### 2. Wallet Adjustment (transaction.service.ts)

```typescript
async adjustWallet(dto: AdjustWalletDto, adminId: string) {
  // ...
  const finalAmount = type === AdjustmentType.CREDIT ? amount : -amount;

  // ✅ CORRECT: Using Prisma increment with proper sign
  await tx.store.update({
    where: { id: targetId },
    data: { walletBalance: { increment: finalAmount } },
    //  If finalAmount is -100, this decrements by 100 ✅
  });

  // ❌ WRONG: Using addition
  // data: { walletBalance: { increment: amount } } // Always adds!

  // Create ledger entry with correct balance
  const transaction = await tx.transaction.create({
    data: {
      balanceBefore: currentBalance,
      balanceAfter: currentBalance + finalAmount,  // ✅ Correct math
    },
  });
}
```

---

## Frontend Implementation Guide

### 1. Order Details Card

```typescript
// FILE: transactions/[id]/component/OrderDetailsCard.tsx

import { safePercent, safeSubtract, validateOrderFinancialBreakdown } from '@/utils/financial';

export const OrderDetailsCard = ({ details, financialBreakdown }: OrderDetailsProps) => {
  // Validate breakdown on component mount or when data changes
  useEffect(() => {
    if (financialBreakdown && details.subtotal && details.commissionRate) {
      const validation = validateOrderFinancialBreakdown({
        subtotal: details.subtotal,
        commissionRate: details.commissionRate,
        commissionAmount: financialBreakdown.platformCommission,
        vendorReceives: financialBreakdown.vendorReceives,
      });

      if (!validation.valid) {
        console.error('Financial breakdown validation failed:', validation.errors);
        // Show warning to admin
      }
    }
  }, [financialBreakdown, details]);

  return (
    <div>
      {/* Display with currency formatting */}
      <span className="text-white">
        <Currency amount={financialBreakdown.vendorReceives} />
      </span>
    </div>
  );
};
```

### 2. Wallet Balance Display

```typescript
// FILE: transactions/[id]/component/WalletBalanceCard.tsx

import { validateWalletBalanceChange } from '@/utils/financial';

export const WalletBalanceCard = ({
  before,
  after,
  amount,
  isCredit,
}: WalletBalanceProps) => {
  // Validate on mount
  useEffect(() => {
    const validation = validateWalletBalanceChange({
      balanceBefore: before,
      balanceAfter: after,
      transactionAmount: amount,
      isCredit,
    });

    if (!validation.valid) {
      console.error('Balance validation failed:', validation.message);
      // Log potential issue
    }
  }, [before, after, amount, isCredit]);

  return (
    <div className="space-y-4">
      <div className="flex justify-between">
        <span>Before</span>
        <Currency amount={before} />
      </div>
      <div className="flex justify-between">
        <span>Transaction</span>
        <Currency amount={Math.abs(amount)} />
      </div>
      <div className="flex justify-between border-t pt-3">
        <span>After</span>
        <Currency amount={after} />
      </div>
    </div>
  );
};
```

### 3. Wallet Adjustment Modal

```typescript
// FILE: transactions/component/WalletAdjustmentModal.tsx

import { validateWalletAdjustment } from '@/utils/wallet-validation';
import { validateWalletBalanceChange } from '@/utils/financial';

export default function WalletAdjustmentModal({
  isOpen,
  onClose,
  onSuccess,
}: WalletAdjustmentModalProps) {
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // ✅ ADD VALIDATION
    const validation = validateWalletAdjustment(amount, description);
    if (!validation.valid) {
      setErrors(validation.errors);
      Swal.fire({
        icon: 'error',
        title: 'Validation Error',
        html: validation.errors.join('<br/>'),
      });
      return;
    }

    // Proceed with adjustment
    try {
      const response = await fetch('/super-admin/transactions/adjust-wallet', {
        method: 'POST',
        body: JSON.stringify({
          targetId: selectedEntity.id,
          targetType,
          type,
          amount: parseFloat(amount),
          description,
        }),
      });

      const result = await response.json();
      // After successful adjustment, validate the response
      // ...
    } catch (error) {
      // ...
    }
  };

  return (
    // ...
  );
}
```

---

## Testing Guidelines

### Unit Tests

```typescript
// Test that calculations match formulas
it('vendor receives = subtotal - commission', () => {
  const subtotal = 1000;
  const commission = 100;
  const vendorReceives = safeSubtract(subtotal, commission);
  
  expect(vendorReceives).toBe(900);
  expect(vendorReceives).not.toBe(safeAdd(subtotal, commission));
});

// Test the reported issue scenario
it('should fix the reported issue: 43367.50 - 2137.50 = 41230.00', () => {
  const result = safeSubtract(43367.50, 2137.50);
  expect(result).toBe(41230.00);
  expect(result).not.toBe(45505.00); // The buggy result
});
```

### Integration Tests

```typescript
// Test full transaction flow
it('should correctly create order transaction with financial breakdown', async () => {
  const response = await request(app)
    .get('/super-admin/transactions/order-123')
    .set('Authorization', `Bearer ${token}`);

  expect(response.status).toBe(200);
  
  // Validate breakdown
  const { financialBreakdown } = response.body;
  const validation = validateOrderFinancialBreakdown({
    subtotal: response.body.orderDetails.subtotal,
    commissionRate: response.body.orderDetails.commissionRate,
    commissionAmount: financialBreakdown.platformCommission,
    vendorReceives: financialBreakdown.vendorReceives,
  });

  expect(validation.valid).toBe(true);
});
```

---

## Common Mistakes & How to Fix Them

### ❌ Mistake 1: Using Addition for Deductions

```typescript
// WRONG
const vendorReceives = subtotal + commission; // Adds instead of subtracts!

// CORRECT
const vendorReceives = safeSubtract(subtotal, commission);
// or
const vendorReceives = subtotal - commission;
```

### ❌ Mistake 2: Floating-Point Precision

```typescript
// WRONG
const commission = 1000 * 0.1; // 100 (might have precision issues)
const vendorReceives = 1000 - commission; // 900.0000000001

// CORRECT
const commission = safePercent(1000, 10); // 100
const vendorReceives = safeSubtract(1000, commission); // 900
```

### ❌ Mistake 3: String vs Number

```typescript
// WRONG
const amount = "100.50"; // String!
const total = amount + 50; // "100.5050" (concatenation!)

// CORRECT
const amount = parseFloat("100.50"); // 100.5
const total = safeAdd(amount, 50); // 150.5
```

### ❌ Mistake 4: Not Validating Input

```typescript
// WRONG
const adjustment = parseFloat(userInput); // Could be NaN, Infinity, negative

// CORRECT
if (!isValidAmount(userInput)) {
  throw new Error('Invalid amount');
}
const adjustment = parseFloat(userInput);
```

---

## Debugging Financial Issues

### Enable Debug Logging

```typescript
import { debugFinancialCalculation } from '@/utils/financial';

// Log calculations during development
debugFinancialCalculation({
  subtotal: 43367.50,
  commissionRate: 5,
  commission: 2168.38,
  vendorReceives: 41199.13,
});

// Output:
// [FINANCIAL DEBUG]
// {
//   "timestamp": "2026-05-12T10:30:45.123Z",
//   "calculation": {
//     "subtotal": "₦43,367.50",
//     "commissionRate": "₦5.00",
//     "commission": "₦2,168.38",
//     "vendorReceives": "₦41,199.13"
//   }
// }
```

### Check Discrepancies

```typescript
// Calculate expected vs actual
const expected = safeSubtract(subtotal, commission);
const actual = vendorReceives;
const discrepancy = safeDifference(expected, actual);

if (discrepancy > 0.01) {
  console.error(`Mismatch! Expected ₦${expected}, got ₦${actual}`);
}
```

---

## Deployment Checklist

Before deploying changes related to financial calculations:

- [ ] All financial calculation tests passing
- [ ] Validation functions returning expected results
- [ ] Edge cases tested (0, 100%, very large amounts)
- [ ] Database migration if schema changed
- [ ] Audit trail setup working
- [ ] Monitoring/alerts configured
- [ ] Documentation updated
- [ ] Code review completed with finance team

---

## References

- [FINANCIAL_AUDIT_REPORT.md](./FINANCIAL_AUDIT_REPORT.md) - Complete audit findings
- [financial.ts](./web/customer-web-app/src/utils/financial.ts) - Utility implementation
- [financial.spec.ts](./web/customer-web-app/src/utils/financial.spec.ts) - Test suite
