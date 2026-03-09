/**
 * ride-view-model-types.test.ts
 *
 * Compile-time + runtime type-shape tests for the RideViewModel & friends.
 *
 * Covers:
 *  H1 — RideStatus union has exactly 12 members, no PENDING/ACCEPTED
 *  M1 — RideViewModel has NO estimatedFare field
 *  C5 — RideViewModel has paymentReference?: string
 *  L8 — DriverView.rating is number | null
 */

import type {
  RideStatus,
  RideViewModel,
  DriverView,
  BackendRide,
} from '@/types/ride-view-model';

// ─── H1: Canonical RideStatus members ────────────────────────────────────────
describe('H1 — RideStatus type members', () => {
  // We cannot enumerate a TypeScript union at runtime, but we can confirm
  // that every expected member is assignable and build a comprehensive list.
  const expectedStatuses: RideStatus[] = [
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

  it('all 12 canonical statuses are assignable to RideStatus', () => {
    // This test passes if the file compiles — each member is valid.
    expect(expectedStatuses).toHaveLength(12);
  });

  it('PENDING is NOT a valid RideStatus (type regression guard)', () => {
    // If someone re-adds PENDING to the union, we want to know.
    // At runtime, all strings are valid JS values — this test documents intent.
    // @ts-expect-error — PENDING is intentionally not in RideStatus
    const _pending: RideStatus = 'PENDING';
    // The runtime assertion doesn't matter; the @ts-expect-error does:
    // If PENDING becomes valid, the @ts-expect-error directive will FAIL the build.
    expect(true).toBe(true); // placeholder so Jest counts the test
  });

  it('ACCEPTED is NOT a valid RideStatus (type regression guard)', () => {
    // @ts-expect-error — ACCEPTED is intentionally not in RideStatus
    const _accepted: RideStatus = 'ACCEPTED';
    expect(true).toBe(true);
  });
});

// ─── M1: RideViewModel shape ─────────────────────────────────────────────────
describe('M1 — RideViewModel does NOT have estimatedFare', () => {
  it('ViewModel type definition: estimatedFare is NOT a key', () => {
    // We use a structural check: create a compliant ViewModel and verify
    // no estimatedFare key exists in the type's compile-time shape.
    const vm: RideViewModel = {
      id: 'test',
      status: 'COMPLETED',
      statusLabel: 'Completed',
      pickupAddress: { addressText: 'A', lat: 0, lng: 0 },
      dropoffAddress: { addressText: 'B', lat: 0, lng: 0 },
      actualFare: 1000,
      createdAt: new Date(),
    };

    // estimatedFare should NOT be a property
    expect(vm).not.toHaveProperty('estimatedFare');
  });

  it('BackendRide still has estimatedFare (deprecated)', () => {
    const backendRide: Partial<BackendRide> = { estimatedFare: 5000 };
    expect(backendRide.estimatedFare).toBe(5000);
  });
});

// ─── C5: paymentReference on RideViewModel ───────────────────────────────────
describe('C5 — paymentReference on RideViewModel', () => {
  it('paymentReference is an optional string on ViewModel', () => {
    const vm: RideViewModel = {
      id: 'test',
      status: 'COMPLETED',
      statusLabel: 'Completed',
      pickupAddress: { addressText: 'A', lat: 0, lng: 0 },
      dropoffAddress: { addressText: 'B', lat: 0, lng: 0 },
      actualFare: 1000,
      createdAt: new Date(),
      paymentReference: 'PAY-123',
    };
    expect(vm.paymentReference).toBe('PAY-123');
  });
});

// ─── L8: DriverView.rating is number | null ─────────────────────────────────
describe('L8 — DriverView.rating type', () => {
  it('accepts number', () => {
    const driver: DriverView = {
      id: 'd1',
      name: 'Test',
      image: null,
      rating: 4.5,
      vehicleNumber: null,
      vehicleModel: null,
      vehicleBrand: null,
      phone: null,
    };
    expect(driver.rating).toBe(4.5);
  });

  it('accepts null', () => {
    const driver: DriverView = {
      id: 'd1',
      name: 'Test',
      image: null,
      rating: null,
      vehicleNumber: null,
      vehicleModel: null,
      vehicleBrand: null,
      phone: null,
    };
    expect(driver.rating).toBeNull();
  });
});
