/**
 * WALLET BALANCE VALIDATION UTILITIES
 * 
 * Validates that wallet balance calculations are mathematically correct.
 * Detects common bugs like:
 * - Addition instead of subtraction
 * - Inverted debits/credits
 * - Absolute value errors
 * - Hardcoded zero balances
 */

/**
 * Validates wallet balance before/after against transaction amount
 * 
 * @param before Starting wallet balance
 * @param after Ending wallet balance  
 * @param amount Transaction amount (signed: positive=credit, negative=debit)
 * @param type Transaction type
 * @returns Validation result with error message if invalid
 */
export function validateWalletBalances(
  before: number,
  after: number,
  amount: number,
  type: string,
): {
  valid: boolean;
  error?: string;
  expectedAfter?: number;
  expectedAmount?: number;
  diff?: number;
} {
  const creditTypes = [
    'PAYMENT_RECEIVED',
    'WALLET_TOPUP',
    'VENDOR_EARNING',
    'RIDER_EARNING',
    'REFUND_ISSUED',
  ];
  
  const isCredit = creditTypes.includes(type);
  
  // The difference between after and before
  const diff = after - before;
  
  // For CREDIT: amount should be positive, diff should be positive
  // For DEBIT: amount can be negative or the type determines it's a debit
  const expectedAmount = isCredit ? Math.abs(amount) : -Math.abs(amount);
  const expectedAfter = before + expectedAmount;

  // ❌ CRITICAL BUG DETECTION #1: Debit showing as credit (inversion)
  if (!isCredit && amount < 0 && after > before && before >= 0) {
    return {
      valid: false,
      error: `CRITICAL: Debit transaction showing balance INCREASE (inversion bug detected)! Before: ₦${before.toFixed(2)}, After: ₦${after.toFixed(2)}, Amount: ₦${amount.toFixed(2)}. This suggests calculation used: after = before - (negative_amount) = before + abs(amount)`,
      expectedAfter,
      expectedAmount,
      diff,
    };
  }

  // ❌ BUG DETECTION #2: Credit showing as debit (inversion)
  if (isCredit && amount > 0 && after < before) {
    return {
      valid: false,
      error: `Balance error: Credit transaction showing balance DECREASE. Before: ₦${before.toFixed(2)}, After: ₦${after.toFixed(2)}, Amount: ₦${amount.toFixed(2)}`,
      expectedAfter,
      expectedAmount,
      diff,
    };
  }

  // ❌ BUG DETECTION #3: Math doesn't add up (within 0.01 tolerance)
  const tolerance = 0.01;
  if (Math.abs(diff - expectedAmount) > tolerance) {
    // Check if this is likely a hardcoded zero issue
    if (before === 0 && after === 0 && Math.abs(amount) > tolerance) {
      return {
        valid: false,
        error: `Balance tracking missing: Transaction for ₦${Math.abs(amount).toFixed(2)} shows no balance change (before=0, after=0). Balances may be hardcoded.`,
        expectedAfter,
        expectedAmount,
        diff,
      };
    }

    return {
      valid: false,
      error: `Balance calculation error: Expected diff ${expectedAmount.toFixed(2)}, got ${diff.toFixed(2)} (difference: ${(diff - expectedAmount).toFixed(2)})`,
      expectedAfter,
      expectedAmount,
      diff,
    };
  }

  // ❌ BUG DETECTION #4: After balance doesn't match expected (within tolerance)
  if (Math.abs(after - expectedAfter) > tolerance) {
    return {
      valid: false,
      error: `After balance mismatch: Expected ₦${expectedAfter.toFixed(2)}, got ₦${after.toFixed(2)}`,
      expectedAfter,
      expectedAmount,
      diff,
    };
  }

  // ✅ All validations passed
  return { 
    valid: true,
    expectedAfter,
    expectedAmount,
    diff,
  };
}

/**
 * Format balance change for display
 */
export function formatBalanceChange(
  before: number,
  after: number,
): string {
  const diff = after - before;
  if (diff >= 0) {
    return `+₦${diff.toFixed(2)}`;
  } else {
    return `-₦${Math.abs(diff).toFixed(2)}`;
  }
}

/**
 * Determines if a transaction is a credit or debit
 */
export function isCreditTransaction(type: string): boolean {
  const creditTypes = [
    'PAYMENT_RECEIVED',
    'WALLET_TOPUP',
    'VENDOR_EARNING',
    'RIDER_EARNING',
  ];
  return creditTypes.includes(type);
}

/**
 * Get expected balance after transaction
 */
export function calculateExpectedAfterBalance(
  before: number,
  amount: number,
  type: string,
): number {
  const isCredit = isCreditTransaction(type);
  const signedAmount = isCredit ? Math.abs(amount) : -Math.abs(amount);
  return before + signedAmount;
}
