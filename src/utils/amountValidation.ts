/**
 * Transaction amount validation.
 * Prevents zero, negative, NaN, Infinity, and excessive decimal precision.
 */

export interface AmountValidationResult {
  valid: boolean;
  error?: string;
}

export function validateAmount(
  amount: number,
  decimals: number,
  availableBalance: number,
  fee: number,
): AmountValidationResult {
  if (typeof amount !== 'number' || Number.isNaN(amount)) {
    return { valid: false, error: 'Amount is not a valid number' };
  }
  if (!Number.isFinite(amount)) return { valid: false, error: 'Amount must be finite' };
  if (amount <= 0) return { valid: false, error: 'Amount must be greater than zero' };
  if (decimals < 0 || decimals > 18) return { valid: false, error: 'Invalid decimal precision' };

  const amountStr = amount.toString();
  const dotIdx = amountStr.indexOf('.');
  if (dotIdx !== -1 && amountStr.length - dotIdx - 1 > decimals) {
    return { valid: false, error: `Amount exceeds ${decimals} decimal places` };
  }

  if (typeof fee !== 'number' || Number.isNaN(fee) || fee < 0) {
    return { valid: false, error: 'Invalid fee' };
  }

  const total = amount + fee;
  if (!Number.isFinite(total)) return { valid: false, error: 'Total amount overflows' };
  if (total > availableBalance) return { valid: false, error: 'Insufficient balance for amount plus fee' };

  return { valid: true };
}

export function validatePositiveAmount(amount: number, decimals: number): AmountValidationResult {
  if (typeof amount !== 'number' || Number.isNaN(amount)) return { valid: false, error: 'Amount is not a valid number' };
  if (!Number.isFinite(amount)) return { valid: false, error: 'Amount must be finite' };
  if (amount <= 0) return { valid: false, error: 'Amount must be greater than zero' };
  const amountStr = amount.toString();
  const dotIdx = amountStr.indexOf('.');
  if (dotIdx !== -1 && amountStr.length - dotIdx - 1 > decimals) {
    return { valid: false, error: `Amount exceeds ${decimals} decimal places` };
  }
  return { valid: true };
}
