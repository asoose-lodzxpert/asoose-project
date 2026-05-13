/**
 * WALLET ADJUSTMENT VALIDATION MODULE
 * 
 * Provides validation rules for wallet adjustment operations
 * Integrated with WalletAdjustmentModal component
 */

export interface WalletAdjustmentValidation {
  valid: boolean;
  errors: string[];
}

/**
 * Validate wallet adjustment form data
 * 
 * Rules:
 * - Amount must be a valid number
 * - Amount must be greater than 0
 * - Amount must have max 2 decimal places
 * - Description must be 5-200 characters
 */
export function validateWalletAdjustment(
  amount: string,
  description: string
): WalletAdjustmentValidation {
  const errors: string[] = [];

  // Validate amount
  if (!amount || amount.trim() === '') {
    errors.push('Amount is required');
  } else {
    const numAmount = parseFloat(amount);
    
    if (isNaN(numAmount)) {
      errors.push('Amount must be a valid number');
    } else if (numAmount <= 0) {
      errors.push('Amount must be greater than 0');
    } else if (numAmount > 100000000) {
      errors.push('Amount exceeds maximum limit (₦100M)');
    } else if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
      errors.push('Maximum 2 decimal places allowed');
    }
  }

  // Validate description
  if (!description || description.trim() === '') {
    errors.push('Description is required');
  } else {
    const trimmed = description.trim();
    if (trimmed.length < 5) {
      errors.push('Description must be at least 5 characters');
    }
    if (trimmed.length > 200) {
      errors.push('Description must not exceed 200 characters');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Format validation errors for display
 */
export function formatValidationErrors(errors: string[]): string {
  if (errors.length === 0) return '';
  if (errors.length === 1) return errors[0];
  return errors.map((e, i) => `${i + 1}. ${e}`).join('\n');
}

/**
 * Real-time validation as user types
 */
export function getAmountError(amount: string): string | null {
  if (!amount) return null;

  const numAmount = parseFloat(amount);
  
  if (isNaN(numAmount)) {
    return 'Invalid number format';
  }
  
  if (numAmount <= 0) {
    return 'Amount must be greater than 0';
  }
  
  if (numAmount > 100000000) {
    return 'Exceeds maximum limit (₦100M)';
  }
  
  if (!/^\d+(\.\d{1,2})?$/.test(amount)) {
    return 'Max 2 decimal places';
  }

  return null;
}

/**
 * Format amount input (add thousand separators while typing)
 */
export function formatAmountInput(input: string): string {
  // Remove non-numeric characters except decimal point
  let cleaned = input.replace(/[^\d.]/g, '');
  
  // Remove multiple decimal points
  const parts = cleaned.split('.');
  if (parts.length > 2) {
    cleaned = parts[0] + '.' + parts.slice(1).join('');
  }
  
  // Limit to 2 decimal places
  if (parts[1] && parts[1].length > 2) {
    cleaned = parts[0] + '.' + parts[1].substring(0, 2);
  }
  
  return cleaned;
}

/**
 * Description input validation
 */
export function getDescriptionError(description: string): string | null {
  if (!description) return 'Description is required';
  
  const trimmed = description.trim();
  
  if (trimmed.length < 5) {
    return `Minimum 5 characters (${trimmed.length}/5)`;
  }
  
  if (trimmed.length > 200) {
    return `Exceeds 200 character limit (${trimmed.length}/200)`;
  }

  return null;
}

/**
 * Calculate estimated impact on wallet
 */
export function calculateImpactEstimate(
  currentBalance: number,
  adjustmentAmount: number,
  type: 'CREDIT' | 'DEBIT'
): {
  currentBalance: number;
  adjustment: number;
  newBalance: number;
  type: string;
  warning?: string;
} {
  const adjustment = type === 'CREDIT' ? adjustmentAmount : -adjustmentAmount;
  const newBalance = currentBalance + adjustment;

  const result: any = {
    currentBalance,
    adjustment: Math.abs(adjustmentAmount),
    newBalance,
    type: type === 'CREDIT' ? 'Credit (+)' : 'Debit (-)',
  };

  // Add warnings
  if (type === 'DEBIT' && newBalance < 0) {
    result.warning = 'This debit will result in negative balance';
  }

  if (type === 'DEBIT' && newBalance < 1000) {
    result.warning = 'Balance will be below ₦1,000';
  }

  return result;
}
