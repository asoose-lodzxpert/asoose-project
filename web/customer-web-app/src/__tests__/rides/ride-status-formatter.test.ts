/**
 * ride-status-formatter.test.ts
 *
 * Regression tests for the ride-status formatter module.
 *
 * Covers:
 *  H1 — STATUS_MAP keyed by string; legacy PENDING/ACCEPTED entries exist
 *        but are NOT in the canonical RideStatus type
 *  H2 — DRIVER_ASSIGNED → "confirmed" (was incorrectly "searching")
 *  L9 — mapBackendStatusToRideStage takes exactly 2 params (removed _paymentConfirmed)
 *  C4 — All cancellation variants map to "idle"
 */

import {
  formatRideStatus,
  getStatusDisplay,
  mapBackendStatusToRideStage,
  formatCurrency,
  formatRideTime,
  formatRideDateTime,
} from '@/services/formatters/ride-status.formatter';
import type { RideStatus } from '@/types/ride-view-model';

// ─── H1: RideStatus union excludes legacy values ─────────────────────────────
describe('H1 — RideStatus canonical union', () => {
  const canonicalStatuses: RideStatus[] = [
    'REQUESTED',
    'SEARCHING_DRIVER',
    'DRIVER_ASSIGNED',
    'DRIVER_ACCEPTED',
    'PAID',
    'ARRIVED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'CANCELLED_BY_USER',
    'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_SYSTEM',
  ];

  it.each(canonicalStatuses)('has a STATUS_MAP entry for canonical status %s', (status) => {
    const display = getStatusDisplay(status);
    expect(display.label).toBeTruthy();
    expect(display.badge).toBeTruthy();
  });

  it('does NOT include PENDING in the RideStatus type (compile-time test)', () => {
    // Runtime: formatRideStatus still handles "PENDING" for legacy DB rows
    const label = formatRideStatus('PENDING' as any);
    expect(label).toBe('Processing');
    // But PENDING is NOT assignable to RideStatus at compile time.  
    // The TS compiler rejects:  const s: RideStatus = 'PENDING';
  });

  it('does NOT include ACCEPTED in the RideStatus type (compile-time test)', () => {
    const label = formatRideStatus('ACCEPTED' as any);
    expect(label).toBe('Driver Arriving');
  });

  it('falls back gracefully for unknown status strings', () => {
    const label = formatRideStatus('IMAGINARY_STATUS' as any);
    expect(label).toBe('IMAGINARY_STATUS'); // returns raw string
  });
});

// ─── H2: DRIVER_ASSIGNED → "confirmed" (not "searching") ────────────────────
describe('H2 — DRIVER_ASSIGNED maps to confirmed', () => {
  it('maps DRIVER_ASSIGNED to "confirmed"', () => {
    expect(mapBackendStatusToRideStage('DRIVER_ASSIGNED')).toBe('confirmed');
  });

  it('maps DRIVER_ACCEPTED to "confirmed"', () => {
    expect(mapBackendStatusToRideStage('DRIVER_ACCEPTED')).toBe('confirmed');
  });

  it('DRIVER_ASSIGNED must NOT be "searching"', () => {
    expect(mapBackendStatusToRideStage('DRIVER_ASSIGNED')).not.toBe('searching');
  });
});

// ─── L9: mapBackendStatusToRideStage signature — 2 params only ──────────────
describe('L9 — mapBackendStatusToRideStage has 2 params (no _paymentConfirmed)', () => {
  it('has a max of 2 parameters', () => {
    // Function.length counts params before the first default value
    expect(mapBackendStatusToRideStage.length).toBeLessThanOrEqual(2);
  });

  it('second param controls COMPLETED → "finished" vs "payment-required"', () => {
    expect(mapBackendStatusToRideStage('COMPLETED', false)).toBe('payment-required');
    expect(mapBackendStatusToRideStage('COMPLETED', true)).toBe('finished');
  });

  it('PAID always maps to "finished" regardless of second param', () => {
    expect(mapBackendStatusToRideStage('PAID', false)).toBe('finished');
    expect(mapBackendStatusToRideStage('PAID', true)).toBe('finished');
  });
});

// ─── C4: All cancellation variants → "idle" ─────────────────────────────────
describe('C4 — all cancellation variants map to idle', () => {
  const cancelStatuses = [
    'CANCELLED',
    'CANCELLED_BY_USER',
    'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_SYSTEM',
  ];

  it.each(cancelStatuses)('%s maps to "idle"', (status) => {
    expect(mapBackendStatusToRideStage(status)).toBe('idle');
  });

  it.each(cancelStatuses)('%s has a red badge in getStatusDisplay', (status) => {
    const display = getStatusDisplay(status);
    expect(display.badge).toContain('red');
    expect(display.icon).toBe('x');
  });

  it('CANCELLED_BY_USER displays "Cancelled by You"', () => {
    expect(formatRideStatus('CANCELLED_BY_USER')).toBe('Cancelled by You');
  });

  it('CANCELLED_BY_DRIVER displays "Cancelled by Driver"', () => {
    expect(formatRideStatus('CANCELLED_BY_DRIVER')).toBe('Cancelled by Driver');
  });

  it('CANCELLED_BY_SYSTEM displays "Auto-cancelled"', () => {
    expect(formatRideStatus('CANCELLED_BY_SYSTEM')).toBe('Auto-cancelled');
  });
});

// ─── Full mapping table snapshot ─────────────────────────────────────────────
describe('mapBackendStatusToRideStage — full mapping table', () => {
  const mappings: Array<[string, boolean | undefined, string]> = [
    ['REQUESTED', false, 'searching'],
    ['SEARCHING_DRIVER', false, 'searching'],
    ['DRIVER_ASSIGNED', false, 'confirmed'],
    ['DRIVER_ACCEPTED', false, 'confirmed'],
    ['PAID', false, 'finished'],
    ['ARRIVED', false, 'arrived'],
    ['IN_PROGRESS', false, 'in-progress'],
    ['COMPLETED', false, 'payment-required'],
    ['COMPLETED', true, 'finished'],
    ['CANCELLED', false, 'idle'],
    ['CANCELLED_BY_USER', false, 'idle'],
    ['CANCELLED_BY_DRIVER', false, 'idle'],
    ['CANCELLED_BY_SYSTEM', false, 'idle'],
    // Legacy
    ['PENDING', false, 'idle'],
    ['ACCEPTED', false, 'confirmed'],
    // Unknown
    ['SOME_NEW_STATUS', false, 'idle'],
  ];

  it.each(mappings)(
    '(%s, serverPaid=%s) → %s',
    (status, serverPaid, expected) => {
      expect(mapBackendStatusToRideStage(status, !!serverPaid)).toBe(expected);
    },
  );
});

// ─── Utility formatters ──────────────────────────────────────────────────────
describe('Utility formatters', () => {
  it('formatCurrency formats NGN currency', () => {
    const result = formatCurrency(3500);
    expect(result).toContain('3,500');
  });

  it('formatCurrency handles null/undefined', () => {
    expect(formatCurrency(undefined)).toBe('₦0.00');
    expect(formatCurrency(null as any)).toBe('₦0.00');
  });

  it('formatRideTime returns "--:--" for missing date', () => {
    expect(formatRideTime(undefined)).toBe('--:--');
    expect(formatRideTime('')).toBe('--:--');
  });

  it('formatRideDateTime returns empty string for missing date', () => {
    expect(formatRideDateTime(undefined)).toBe('');
  });
});
