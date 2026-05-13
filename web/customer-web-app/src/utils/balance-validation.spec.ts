/**
 * WALLET BALANCE VALIDATION TEST SUITE
 * 
 * Tests for detecting balance calculation bugs including:
 * - Addition/subtraction inversion
 * - Hardcoded zero balances
 * - Floating-point precision issues
 * - Debit/credit sign handling
 */

import {
  validateWalletBalances,
  formatBalanceChange,
  isCreditTransaction,
  calculateExpectedAfterBalance,
} from './balance-validation';

describe('Balance Validation Utilities', () => {
  describe('validateWalletBalances - Credit Transactions', () => {
    it('should validate correct credit transaction', () => {
      const result = validateWalletBalances(
        1000,    // before
        2900,    // after
        2900,    // amount (positive for credit)
        'VENDOR_EARNING'
      );

      expect(result.valid).toBe(true);
      expect(result.diff).toBe(1900);
      expect(result.expectedAfter).toBe(2900);
    });

    it('should detect credit showing as debit (inverted)', () => {
      const result = validateWalletBalances(
        1000,    // before
        -900,    // after (WRONG for credit)
        2900,    // amount
        'VENDOR_EARNING'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('DECREASE');
    });

    it('should validate wallet topup', () => {
      const result = validateWalletBalances(
        0,       // before
        5000,    // after
        5000,    // amount
        'WALLET_TOPUP'
      );

      expect(result.valid).toBe(true);
    });
  });

  describe('validateWalletBalances - Debit Transactions', () => {
    it('should validate correct debit transaction', () => {
      const result = validateWalletBalances(
        5000,    // before
        2100,    // after
        -2900,   // amount (negative for debit)
        'ADJUSTMENT'
      );

      expect(result.valid).toBe(true);
      expect(result.diff).toBe(-2900);
      expect(result.expectedAfter).toBe(2100);
    });

    it('should detect reported bug: debit showing as credit (inversion)', () => {
      // THIS IS THE BUG FROM THE USER'S REPORT
      const result = validateWalletBalances(
        0,       // before
        2900,    // after (WRONG! Should be -2900 or 0)
        -2900,   // amount (signed debit)
        'ADJUSTMENT'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('CRITICAL');
      expect(result.error).toContain('inversion bug');
      expect(result.expectedAfter).toBe(-2900);
    });

    it('should validate debit from zero balance (negative result)', () => {
      const result = validateWalletBalances(
        0,       // before
        -2900,   // after (correct: zero minus 2900)
        -2900,   // amount
        'ADJUSTMENT'
      );

      expect(result.valid).toBe(true);
    });

    it('should validate debit resulting in positive balance decrease', () => {
      const result = validateWalletBalances(
        10000,   // before
        7100,    // after
        -2900,   // amount
        'ADJUSTMENT'
      );

      expect(result.valid).toBe(true);
      expect(result.diff).toBe(-2900);
    });
  });

  describe('validateWalletBalances - Edge Cases', () => {
    it('should handle floating-point precision (within 0.01)', () => {
      const result = validateWalletBalances(
        100.00,
        102.89,   // Very close to 100 + 2.89 but with rounding
        2.89,
        'WALLET_TOPUP'
      );

      expect(result.valid).toBe(true);
    });

    it('should reject floating-point errors > 0.01', () => {
      const result = validateWalletBalances(
        100.00,
        103.00,   // Off by more than 0.01
        2.89,
        'WALLET_TOPUP'
      );

      expect(result.valid).toBe(false);
    });

    it('should detect hardcoded zero balances', () => {
      const result = validateWalletBalances(
        0,       // before
        0,       // after
        2900,    // but amount is significant
        'REFUND_ISSUED'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('hardcoded');
    });

    it('should allow zero balances if amount is near zero', () => {
      const result = validateWalletBalances(
        0,
        0,
        0,
        'ADJUSTMENT'
      );

      expect(result.valid).toBe(true);
    });

    it('should validate negative balances', () => {
      const result = validateWalletBalances(
        -1000,   // negative before
        -3900,   // negative after
        -2900,   // debit
        'ADJUSTMENT'
      );

      expect(result.valid).toBe(true);
    });

    it('should detect incorrect calculation: subtraction instead of addition', () => {
      // If backend calculates: after = before - amount (for credit)
      // With amount = 2900, before = 1000: after = 1000 - 2900 = -1900 (WRONG)
      const result = validateWalletBalances(
        1000,
        -1900,   // WRONG: should be 3900
        2900,
        'VENDOR_EARNING'
      );

      expect(result.valid).toBe(false);
      expect(result.expectedAfter).toBe(3900);
    });

    it('should detect incorrect calculation: addition instead of subtraction', () => {
      // If backend calculates: after = before + amount (for debit)
      // With amount = -2900, before = 0: after = 0 + (-2900) = -2900 (actually correct)
      // But if it uses abs(): after = 0 + 2900 = 2900 (WRONG)
      const result = validateWalletBalances(
        0,
        2900,    // WRONG: used abs() in addition
        -2900,   // debit
        'ADJUSTMENT'
      );

      expect(result.valid).toBe(false);
      expect(result.error).toContain('inversion');
    });
  });

  describe('validateWalletBalances - PAYMENT_RECEIVED', () => {
    it('should handle payment with zero balances (common for platform payments)', () => {
      const result = validateWalletBalances(
        0,       // before: platform doesn't track customer wallet directly
        0,       // after
        5000,    // payment amount
        'PAYMENT_RECEIVED'
      );

      // Should NOT flag as error because payments often don't track customer wallet
      expect(result.valid).toBe(true);
    });
  });

  describe('formatBalanceChange', () => {
    it('should format positive change with + sign', () => {
      expect(formatBalanceChange(1000, 2000)).toBe('+₦1000.00');
    });

    it('should format negative change with - sign', () => {
      expect(formatBalanceChange(2000, 500)).toBe('-₦1500.00');
    });

    it('should format zero change', () => {
      expect(formatBalanceChange(1000, 1000)).toBe('+₦0.00');
    });

    it('should handle decimal precision', () => {
      expect(formatBalanceChange(100.50, 102.89)).toBe('+₦2.39');
    });
  });

  describe('isCreditTransaction', () => {
    it('should identify credit types', () => {
      expect(isCreditTransaction('PAYMENT_RECEIVED')).toBe(true);
      expect(isCreditTransaction('WALLET_TOPUP')).toBe(true);
      expect(isCreditTransaction('VENDOR_EARNING')).toBe(true);
      expect(isCreditTransaction('RIDER_EARNING')).toBe(true);
    });

    it('should identify non-credit types', () => {
      expect(isCreditTransaction('ADJUSTMENT')).toBe(false);
      expect(isCreditTransaction('PAYOUT_COMPLETED')).toBe(false);
      expect(isCreditTransaction('COMMISSION_DEDUCTED')).toBe(false);
      expect(isCreditTransaction('REFUND_ISSUED')).toBe(false);
    });
  });

  describe('calculateExpectedAfterBalance', () => {
    it('should calculate credit correctly', () => {
      expect(calculateExpectedAfterBalance(1000, 500, 'VENDOR_EARNING')).toBe(1500);
    });

    it('should calculate debit correctly', () => {
      expect(calculateExpectedAfterBalance(5000, -1500, 'ADJUSTMENT')).toBe(3500);
    });

    it('should handle unsigned amounts for debits', () => {
      // Some callers might pass unsigned amounts
      expect(calculateExpectedAfterBalance(5000, 1500, 'ADJUSTMENT')).toBe(3500);
    });

    it('should handle zero balance', () => {
      expect(calculateExpectedAfterBalance(0, 2900, 'WALLET_TOPUP')).toBe(2900);
    });

    it('should handle negative before balance', () => {
      expect(calculateExpectedAfterBalance(-1000, 2000, 'VENDOR_EARNING')).toBe(1000);
    });
  });

  describe('Real-world Scenarios', () => {
    it('Scenario 1: Vendor debit causing balance inversion', () => {
      // Vendor had ₦0, debit ₦2,900, but UI shows +₦2,900 after
      const result = validateWalletBalances(0, 2900, -2900, 'ADJUSTMENT');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('CRITICAL');
    });

    it('Scenario 2: Order earning credit', () => {
      // Rider has ₦10,000, earns ₦5,000 from order
      const result = validateWalletBalances(10000, 15000, 5000, 'RIDER_EARNING');
      
      expect(result.valid).toBe(true);
    });

    it('Scenario 3: Payout debit', () => {
      // Vendor has ₦50,000, payout of ₦20,000
      const result = validateWalletBalances(50000, 30000, -20000, 'PAYOUT_COMPLETED');
      
      expect(result.valid).toBe(true);
    });

    it('Scenario 4: Refund with tracking issue', () => {
      // Refund has no balance tracking (audit risk)
      const result = validateWalletBalances(0, 0, 10000, 'REFUND_ISSUED');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hardcoded');
    });

    it('Scenario 5: Commission deduction', () => {
      // Platform deducts ₦500 commission from vendor
      const result = validateWalletBalances(5000, 4500, -500, 'COMMISSION_DEDUCTED');
      
      expect(result.valid).toBe(true);
    });
  });

  describe('Bug Detection Examples', () => {
    it('BUG: Subtraction used instead of addition for credit', () => {
      // If code does: after = before - amount (for credit)
      // Expected: 1000 + 2900 = 3900
      // Actual: 1000 - 2900 = -1900
      const result = validateWalletBalances(1000, -1900, 2900, 'VENDOR_EARNING');
      
      expect(result.valid).toBe(false);
      expect(result.expectedAfter).toBe(3900);
      expect(result.expectedAmount).toBe(2900);
    });

    it('BUG: Math.abs used in addition for debit', () => {
      // If code does: after = before + Math.abs(amount) (for debit)
      // Expected: 0 - 2900 = -2900 or 0 (if allow negatives)
      // Actual: 0 + abs(-2900) = 2900
      const result = validateWalletBalances(0, 2900, -2900, 'ADJUSTMENT');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('inversion');
    });

    it('BUG: Amount and balances swapped', () => {
      // If code stores wrong values
      const result = validateWalletBalances(2900, 0, -2900, 'ADJUSTMENT');
      
      expect(result.valid).toBe(false);
      expect(result.expectedAfter).toBe(-2900);
    });

    it('BUG: Hardcoded zeros in PAYOUT_COMPLETED', () => {
      // Payment service records payout but doesn't track balance
      const result = validateWalletBalances(0, 0, -20000, 'PAYOUT_COMPLETED');
      
      expect(result.valid).toBe(false);
      expect(result.error).toContain('hardcoded');
    });
  });
});
