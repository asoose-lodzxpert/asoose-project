/**
 * FINANCIAL UTILITIES TEST SUITE
 * 
 * Tests for safe financial calculations
 * Covers the reported issue: ₦43,367.50 - ₦2,137.50 = ₦41,230.00
 */

import {
  safeAdd,
  safeSubtract,
  safeMultiply,
  safePercent,
  safePercentageDeduction,
  isValidAmount,
  formatAmountTo2Decimals,
  safeDivide,
  safeDifference,
  safeCumulativeSum,
  validateOrderFinancialBreakdown,
  validateWalletBalanceChange,
} from '@/utils/financial';

describe('Financial Utilities', () => {
  describe('safeAdd', () => {
    it('should add two amounts without precision issues', () => {
      expect(safeAdd(0.1, 0.2)).toBe(0.3);
      expect(safeAdd(100, 50)).toBe(150);
      expect(safeAdd(100.50, 50.25)).toBe(150.75);
    });

    it('should handle edge cases', () => {
      expect(safeAdd(0, 0)).toBe(0);
      expect(safeAdd(100, 0)).toBe(100);
      expect(safeAdd(0, 100)).toBe(100);
    });

    it('should round correctly', () => {
      expect(safeAdd(0.01, 0.02)).toBe(0.03);
      expect(safeAdd(1.005, 1.005)).toBe(2.01);
    });
  });

  describe('safeSubtract', () => {
    it('should subtract two amounts correctly', () => {
      expect(safeSubtract(100, 50)).toBe(50);
      expect(safeSubtract(100.50, 50.25)).toBe(50.25);
    });

    it('should handle reported issue scenario', () => {
      // CRITICAL: The reported issue
      // ₦43,367.50 - ₦2,137.50 should equal ₦41,230.00
      const result = safeSubtract(43367.50, 2137.50);
      expect(result).toBe(41230.00);
      
      // Verify it's NOT addition (the bug)
      const buggy = safeAdd(43367.50, 2137.50);
      expect(buggy).toBe(45505.00);
      expect(result).not.toBe(buggy);
    });

    it('should return 0 when subtracting from itself', () => {
      expect(safeSubtract(100, 100)).toBe(0);
      expect(safeSubtract(0, 0)).toBe(0);
    });

    it('should handle precision errors', () => {
      expect(safeSubtract(1.1, 0.1)).toBe(1.0);
      expect(safeSubtract(0.3, 0.1)).toBe(0.2);
    });
  });

  describe('safePercent', () => {
    it('should calculate percentage correctly', () => {
      expect(safePercent(1000, 5)).toBe(50);
      expect(safePercent(1000, 10)).toBe(100);
      expect(safePercent(100, 0)).toBe(0);
      expect(safePercent(100, 100)).toBe(100);
    });

    it('should handle order commission calculation', () => {
      // Order subtotal: 43,367.50
      // Commission rate: 5%
      // Commission amount: 2,168.375 -> rounds to 2,168.38
      const subtotal = 43367.50;
      const commissionRate = 5;
      const expectedCommission = 2168.375;
      
      const commission = safePercent(subtotal, commissionRate);
      expect(commission).toBeCloseTo(expectedCommission, 1);
    });

    it('should round correctly', () => {
      expect(safePercent(1000, 0.5)).toBe(5);
      expect(safePercent(99, 3.33)).toBeCloseTo(3.30, 2);
    });
  });

  describe('safePercentageDeduction', () => {
    it('should correctly calculate amount after percentage deduction', () => {
      // 100 with 10% deduction = 90
      expect(safePercentageDeduction(100, 10)).toBe(90);
      
      // 1000 with 5% deduction = 950
      expect(safePercentageDeduction(1000, 5)).toBe(950);
      
      // 0% deduction = full amount
      expect(safePercentageDeduction(100, 0)).toBe(100);
      
      // 100% deduction = 0
      expect(safePercentageDeduction(100, 100)).toBe(0);
    });

    it('should match vendor receives calculation', () => {
      // This is the critical calculation for vendor earnings
      const subtotal = 43367.50;
      const commissionRate = 5;
      
      // Method 1: Manual
      const commission = safePercent(subtotal, commissionRate);
      const vendorReceivesManual = safeSubtract(subtotal, commission);
      
      // Method 2: Using helper
      const vendorReceivesHelper = safePercentageDeduction(subtotal, commissionRate);
      
      // Both should match
      expect(vendorReceivesManual).toBe(vendorReceivesHelper);
    });
  });

  describe('isValidAmount', () => {
    it('should validate correct amounts', () => {
      expect(isValidAmount(100)).toBe(true);
      expect(isValidAmount(100.50)).toBe(true);
      expect(isValidAmount(0)).toBe(true);
      expect(isValidAmount(0.01)).toBe(true);
    });

    it('should reject invalid inputs', () => {
      expect(isValidAmount('100')).toBe(false);
      expect(isValidAmount(NaN)).toBe(false);
      expect(isValidAmount(Infinity)).toBe(false);
      expect(isValidAmount(-100)).toBe(false);
      expect(isValidAmount(null as any)).toBe(false);
      expect(isValidAmount(undefined as any)).toBe(false);
    });

    it('should reject amounts with more than 2 decimal places', () => {
      expect(isValidAmount(100.555)).toBe(false);
      expect(isValidAmount(100.123)).toBe(false);
      expect(isValidAmount(0.001)).toBe(false);
    });
  });

  describe('formatAmountTo2Decimals', () => {
    it('should format to exactly 2 decimal places', () => {
      expect(formatAmountTo2Decimals(100)).toBe(100);
      expect(formatAmountTo2Decimals(100.1)).toBe(100.1);
      expect(formatAmountTo2Decimals(100.555)).toBe(100.56);
      expect(formatAmountTo2Decimals(0.001)).toBe(0);
    });
  });

  describe('safeDivide', () => {
    it('should divide two amounts correctly', () => {
      expect(safeDivide(100, 2)).toBe(50);
      expect(safeDivide(100, 3)).toBe(33.33);
      expect(safeDivide(1, 3)).toBe(0.33);
    });

    it('should handle division by zero safely', () => {
      expect(safeDivide(100, 0)).toBe(0);
      expect(safeDivide(0, 0)).toBe(0);
    });
  });

  describe('safeDifference', () => {
    it('should calculate absolute difference', () => {
      expect(safeDifference(100, 50)).toBe(50);
      expect(safeDifference(50, 100)).toBe(50);
      expect(safeDifference(100, 100)).toBe(0);
    });
  });

  describe('safeCumulativeSum', () => {
    it('should sum an array of amounts', () => {
      expect(safeCumulativeSum([100, 50, 25])).toBe(175);
      expect(safeCumulativeSum([100.50, 50.25, 25.10])).toBe(175.85);
      expect(safeCumulativeSum([])).toBe(0);
    });

    it('should handle precision correctly', () => {
      const amounts = [0.1, 0.2, 0.3];
      expect(safeCumulativeSum(amounts)).toBe(0.6);
    });
  });

  describe('validateOrderFinancialBreakdown', () => {
    it('should validate correct breakdown', () => {
      const breakdown = {
        subtotal: 1000,
        commissionRate: 10,
        commissionAmount: 100,
        vendorReceives: 900,
      };

      const result = validateOrderFinancialBreakdown(breakdown);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect commission calculation errors', () => {
      const breakdown = {
        subtotal: 1000,
        commissionRate: 10,
        commissionAmount: 150, // Wrong! Should be 100
        vendorReceives: 850,
      };

      const result = validateOrderFinancialBreakdown(breakdown);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('Commission mismatch');
    });

    it('should detect the reported bug (addition instead of subtraction)', () => {
      const breakdown = {
        subtotal: 43367.50,
        commissionRate: 5,
        commissionAmount: 2168.375,
        vendorReceives: 45535.875, // WRONG! Uses addition instead of subtraction
      };

      const result = validateOrderFinancialBreakdown(breakdown);
      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      
      // Check for the specific bug detection
      const criticalError = result.errors.find(e => e.includes('ADDITION'));
      expect(criticalError).toBeDefined();
      expect(criticalError).toContain('₦41199.13');
      expect(criticalError).toContain('₦45535.88');
    });

    it('should validate the reported issue scenario', () => {
      // Reported issue: 43367.50 - 2137.50 should equal 41230.00 (NOT 45505.00)
      // Calculate exact commission for this scenario
      const subtotal = 43367.50;
      const commissionRate = 5; // 5% commission
      const commissionAmount = safePercent(subtotal, commissionRate); // 2168.375 → 2168.38
      const vendorReceives = safeSubtract(subtotal, commissionAmount); // 43367.50 - 2168.38 = 41199.12

      const breakdown = {
        subtotal: subtotal,
        commissionRate: commissionRate,
        commissionAmount: commissionAmount,
        vendorReceives: vendorReceives,
      };

      const result = validateOrderFinancialBreakdown(breakdown);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
      expect(vendorReceives).toBe(41199.12); // Correct calculation
      expect(vendorReceives).not.toBe(45505.00); // Not the buggy addition result
    });
  });

  describe('validateWalletBalanceChange', () => {
    it('should validate credit transaction', () => {
      const result = validateWalletBalanceChange({
        balanceBefore: 1000,
        balanceAfter: 1100,
        transactionAmount: 100,
        isCredit: true,
      });

      expect(result.valid).toBe(true);
      expect(result.expectedBalance).toBe(1100);
      expect(result.discrepancy).toBe(0);
    });

    it('should validate debit transaction', () => {
      const result = validateWalletBalanceChange({
        balanceBefore: 1000,
        balanceAfter: 900,
        transactionAmount: 100,
        isCredit: false,
      });

      expect(result.valid).toBe(true);
      expect(result.expectedBalance).toBe(900);
      expect(result.discrepancy).toBe(0);
    });

    it('should detect balance mismatch', () => {
      const result = validateWalletBalanceChange({
        balanceBefore: 1000,
        balanceAfter: 1200, // Wrong!
        transactionAmount: 100,
        isCredit: true,
      });

      expect(result.valid).toBe(false);
      expect(result.expectedBalance).toBe(1100);
      expect(result.discrepancy).toBe(100);
    });

    it('should detect bug: addition instead of subtraction', () => {
      // Simulating the reported bug pattern
      // Should debit 100, but balance increased instead
      const result = validateWalletBalanceChange({
        balanceBefore: 43367.50,
        balanceAfter: 45505.00, // WRONG! Added instead of subtracted
        transactionAmount: 2137.50,
        isCredit: false, // Should be debit (subtract)
      });

      expect(result.valid).toBe(false);
      expect(result.expectedBalance).toBe(41230.00);
      expect(result.discrepancy).toBe(4275.00);
    });
  });
});
