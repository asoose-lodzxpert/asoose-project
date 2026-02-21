/**
 * Generates a unique payment reference string.
 *
 * @param prefix Optional prefix (default `'PAY'`).
 * @returns A string like `PAY-1718123456789-A3F7K`.
 */
export function generateReference(prefix = 'PAY'): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(7).toUpperCase()}`;
}
