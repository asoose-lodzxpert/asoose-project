/**
 * FINANCIAL UTILITIES - Precise decimal handling for NGN currency
 * 
 * This module provides safe mathematical operations for financial calculations,
 * ensuring accuracy and preventing floating-point precision errors.
 * 
 * All amounts are in NGN (Nigerian Naira) with max 2 decimal places.
 */

const DECIMAL_PLACES = 2;
const MULTIPLIER = Math.pow(10, DECIMAL_PLACES); // 100

/**
 * Safely add two amounts
 * Prevents floating-point precision issues
 * 
 * @example
 * safeAdd(0.1, 0.2) => 0.3 (not 0.30000000000000004)
 */
export function safeAdd(a: number, b: number): number {
  return Math.round((a + b) * MULTIPLIER) / MULTIPLIER;
}

/**
 * Safely subtract two amounts
 * This is the CRITICAL function for vendor earnings calculation
 * 
 * @example
 * safeSubtract(43367.50, 2137.50) => 41230.00
 */
export function safeSubtract(a: number, b: number): number {
  return Math.round((a - b) * MULTIPLIER) / MULTIPLIER;
}

/**
 * Safely multiply two amounts
 * Used for percentage calculations
 * 
 * @example
 * safeMultiply(100, 0.5) => 50
 */
export function safeMultiply(a: number, b: number): number {
  return Math.round((a * b) * MULTIPLIER) / MULTIPLIER;
}

/**
 * Calculate percentage of an amount
 * 
 * @example
 * safePercent(1000, 5) => 50 (5% of 1000)
 */
export function safePercent(amount: number, percentageRate: number): number {
  return Math.round((amount * percentageRate / 100) * MULTIPLIER) / MULTIPLIER;
}

/**
 * Calculate remaining amount after percentage deduction
 * Used for calculating vendor receives after commission
 * 
 * CRITICAL CALCULATION FOR THE REPORTED ISSUE
 * 
 * @example
 * safePercentageDeduction(43367.50, 5) => 41199.13 (43367.50 - 5%)
 */
export function safePercentageDeduction(
  baseAmount: number,
  deductionPercentage: number
): number {
  const deductionAmount = safePercent(baseAmount, deductionPercentage);
  return safeSubtract(baseAmount, deductionAmount);
}

/**
 * Validate that amount is a safe financial number
 * - Must be a number
 * - Must not be NaN or Infinity
 * - Must not be negative
 * - Must have max 2 decimal places
 * 
 * @example
 * isValidAmount(100.50) => true
 * isValidAmount(100.555) => false (3 decimals)
 * isValidAmount("100") => false (string)
 * isValidAmount(NaN) => false
 */
export function isValidAmount(amount: unknown): amount is number {
  if (typeof amount !== 'number') return false;
  if (isNaN(amount) || !isFinite(amount)) return false;
  if (amount < 0) return false;
  
  // Check max 2 decimal places
  const decimalPlaces = (amount.toString().split('.')[1] || '').length;
  return decimalPlaces <= DECIMAL_PLACES;
}

/**
 * Format any number to exactly 2 decimal places
 * 
 * @example
 * formatAmountTo2Decimals(100) => 100.00
 * formatAmountTo2Decimals(100.555) => 100.56 (rounded)
 */
export function formatAmountTo2Decimals(amount: number): number {
  return Math.round(amount * MULTIPLIER) / MULTIPLIER;
}

/**
 * Safe division for calculating averages
 * Prevents division by zero and precision errors
 * 
 * @example
 * safeDivide(100, 3) => 33.33
 * safeDivide(100, 0) => 0 (safe fallback)
 */
export function safeDivide(dividend: number, divisor: number): number {
  if (divisor === 0) return 0;
  return Math.round((dividend / divisor) * MULTIPLIER) / MULTIPLIER;
}

/**
 * Calculate the difference between two amounts
 * Useful for variance calculations and balance checks
 * 
 * @example
 * safeDifference(100, 99) => 1
 * safeDifference(99, 100) => 1 (absolute)
 */
export function safeDifference(a: number, b: number): number {
  return Math.abs(Math.round((a - b) * MULTIPLIER) / MULTIPLIER);
}

/**
 * Cumulative sum for aggregations
 * 
 * @example
 * const amounts = [100.50, 50.25, 25.10];
 * safeCumulativeSum(amounts) => 175.85
 */
export function safeCumulativeSum(amounts: number[]): number {
  return amounts.reduce((sum, amount) => safeAdd(sum, amount), 0);
}

/**
 * CRITICAL FINANCIAL VALIDATION FUNCTION
 * Validates order financial breakdown calculations
 * 
 * This function should be called to verify all order calculations
 * before displaying to admin
 * 
 * @throws Error if calculations don't add up
 */
export function validateOrderFinancialBreakdown(breakdown: {
  subtotal: number;
  commissionRate: number;
  commissionAmount: number;
  deliveryFee?: number;
  vendorReceives: number;
  customerPaid?: number;
}): {
  valid: boolean;
  errors: string[];
  expectedValues?: Partial<typeof breakdown>;
} {
  const errors: string[] = [];

  // Validate commission calculation
  const expectedCommission = safePercent(breakdown.subtotal, breakdown.commissionRate);
  if (safeDifference(expectedCommission, breakdown.commissionAmount) > 0.01) {
    errors.push(
      `Commission mismatch: expected ₦${expectedCommission.toFixed(2)}, got ₦${breakdown.commissionAmount.toFixed(2)}`
    );
  }

  // CRITICAL: Validate vendor receives = subtotal - commission
  // This is where the reported bug likely exists
  const expectedVendorReceives = safeSubtract(
    breakdown.subtotal,
    breakdown.commissionAmount
  );
  if (safeDifference(expectedVendorReceives, breakdown.vendorReceives) > 0.01) {
    errors.push(
      `Vendor receives mismatch: expected ₦${expectedVendorReceives.toFixed(2)}, got ₦${breakdown.vendorReceives.toFixed(2)}`
    );
  }

  // Verify NOT addition (common bug pattern)
  const buggyCalculation = safeAdd(breakdown.subtotal, breakdown.commissionAmount);
  if (Math.abs(breakdown.vendorReceives - buggyCalculation) < 0.01) {
    errors.push(
      `CRITICAL: Vendor receives appears to be using ADDITION instead of SUBTRACTION! Expected ₦${expectedVendorReceives.toFixed(2)}, but got ₦${breakdown.vendorReceives.toFixed(2)} (which is subtotal + commission)`
    );
  }

  return {
    valid: errors.length === 0,
    errors,
    expectedValues: errors.length > 0 ? { vendorReceives: expectedVendorReceives } : undefined,
  };
}

/**
 * WALLET BALANCE VALIDATION
 * Validates that balance changes are mathematically correct
 * 
 * Used to verify wallet adjustment operations
 */
export function validateWalletBalanceChange(params: {
  balanceBefore: number;
  balanceAfter: number;
  transactionAmount: number;
  isCredit: boolean;
}): {
  valid: boolean;
  expectedBalance: number;
  discrepancy: number;
  message?: string;
} {
  const { balanceBefore, balanceAfter, transactionAmount, isCredit } = params;

  const expectedBalance = isCredit
    ? safeAdd(balanceBefore, transactionAmount)
    : safeSubtract(balanceBefore, transactionAmount);

  const discrepancy = safeDifference(balanceAfter, expectedBalance);
  const valid = discrepancy < 0.01; // Allow for rounding errors

  return {
    valid,
    expectedBalance,
    discrepancy,
    message: valid
      ? `Balance correctly updated from ₦${balanceBefore.toFixed(2)} to ₦${balanceAfter.toFixed(2)}`
      : `Balance mismatch! Expected ₦${expectedBalance.toFixed(2)}, got ₦${balanceAfter.toFixed(2)} (discrepancy: ₦${discrepancy.toFixed(2)})`,
  };
}

/**
 * DEBUG HELPER: Log financial calculation for troubleshooting
 * 
 * @example
 * debugFinancialCalculation({
 *   subtotal: 43367.50,
 *   commissionRate: 5,
 *   vendorReceives: 41199.13,
 * })
 */
export function debugFinancialCalculation(calculation: Record<string, number>): void {
  const log = {
    timestamp: new Date().toISOString(),
    calculation: Object.entries(calculation).reduce((acc, [key, value]) => {
      acc[key] = `₦${value.toFixed(2)}`;
      return acc;
    }, {} as Record<string, string>),
  };

  console.log('[FINANCIAL DEBUG]', JSON.stringify(log, null, 2));
}
