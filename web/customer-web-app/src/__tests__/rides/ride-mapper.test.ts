/**
 * ride-mapper.test.ts
 *
 * Regression tests for the ride mapper module (ride.mapper.ts).
 *
 * Covers:
 *  M1  — estimatedFare is NOT on RideViewModel (data contract)
 *  C5  — payment.reference → paymentReference mapping
 *  H1  — fallback status is 'REQUESTED' (not 'PENDING')
 *  C4  — mapper handles all CANCELLED variants
 *  General — safe defaults, address construction, driver flattening
 */

import {
  mapRideToViewModel,
  mapRidesToViewModels,
  hasValidCoordinates,
} from '@/services/mappers/ride.mapper';
import type { BackendRide, RideViewModel } from '@/types/ride-view-model';

/** Minimal valid backend ride for testing */
function makeRide(overrides: Partial<BackendRide> = {}): BackendRide {
  return {
    id: 'ride-001',
    status: 'COMPLETED',
    customerId: 'cust-1',
    pickupAddressId: 'addr-1',
    dropoffAddressId: 'addr-2',
    pickupAddress: {
      street: '10 Marina Rd',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.4541,
      lng: 3.3947,
    },
    dropoffAddress: {
      street: '20 Victoria Island',
      city: 'Lagos',
      state: 'Lagos',
      lat: 6.4281,
      lng: 3.4219,
    },
    totalFare: 3500,
    distanceKm: 12.5,
    durationMin: 25,
    createdAt: '2025-03-01T10:00:00Z',
    completedAt: '2025-03-01T10:30:00Z',
    rider: {
      id: 'rider-1',
      name: 'John Driver',
      phone: '08012345678',
      image: 'https://example.com/driver.jpg',
      rating: 4.8,
      vehicle: {
        brand: 'Toyota',
        model: 'Corolla',
        plateNumber: 'ABC-123',
        color: 'White',
        year: 2020,
      },
    },
    payment: {
      id: 'pay-1',
      amount: 3500,
      status: 'COMPLETED',
      method: 'CARD',
      reference: 'PAY-123456789',
    },
    vehicleType: 'ECONOMY',
    ...overrides,
  };
}

// ─── M1: estimatedFare is NOT on RideViewModel ──────────────────────────────
describe('M1 — estimatedFare removed from RideViewModel', () => {
  it('does NOT include estimatedFare on the output ViewModel', () => {
    const ride = makeRide({ estimatedFare: 9999 });
    const vm = mapRideToViewModel(ride);

    // The key should not exist on the mapped ViewModel
    expect(vm).not.toHaveProperty('estimatedFare');
  });

  it('uses totalFare as actualFare', () => {
    const vm = mapRideToViewModel(makeRide({ totalFare: 4200 }));
    expect(vm.actualFare).toBe(4200);
  });

  it('defaults actualFare to 0 when totalFare is undefined', () => {
    const vm = mapRideToViewModel(makeRide({ totalFare: undefined }));
    expect(vm.actualFare).toBe(0);
  });
});

// ─── C5: payment.reference → paymentReference ───────────────────────────────
describe('C5 — paymentReference mapping', () => {
  it('maps payment.reference to paymentReference on ViewModel', () => {
    const vm = mapRideToViewModel(
      makeRide({
        payment: {
          id: 'p1',
          amount: 3500,
          status: 'COMPLETED',
          method: 'CARD',
          reference: 'PAY-REF-ABC',
        },
      }),
    );
    expect(vm.paymentReference).toBe('PAY-REF-ABC');
  });

  it('omits paymentReference when payment.reference is undefined', () => {
    const vm = mapRideToViewModel(
      makeRide({ payment: { id: 'p1', amount: 3500, status: 'COMPLETED', method: 'CARD' } }),
    );
    expect(vm.paymentReference).toBeUndefined();
  });

  it('omits paymentReference when payment is null', () => {
    const vm = mapRideToViewModel(makeRide({ payment: undefined }));
    expect(vm.paymentReference).toBeUndefined();
  });
});

// ─── Fallback status ─────────────────────────────────────────────────────────
describe('Mapper — fallback status is REQUESTED, not PENDING', () => {
  it('returns REQUESTED as fallback when status is missing', () => {
    const vm = mapRideToViewModel(makeRide({ id: undefined as any, status: undefined as any }));
    // The error path produces a fallback ViewModel
    expect(vm.status).toBe('REQUESTED');
  });
});

// ─── C4: All cancellation variants mapped correctly ──────────────────────────
describe('C4 — cancellation variant mapping', () => {
  const cancelVariants = [
    'CANCELLED',
    'CANCELLED_BY_USER',
    'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_SYSTEM',
  ] as const;

  it.each(cancelVariants)('maps %s to a ViewModel with matching status', (status) => {
    const vm = mapRideToViewModel(makeRide({ status }));
    expect(vm.status).toBe(status);
    expect(vm.statusLabel).toBeTruthy();
  });
});

// ─── Driver flattening (rider → driver) ──────────────────────────────────────
describe('Driver mapping safety', () => {
  it('flattens rider → driver with correct field names', () => {
    const vm = mapRideToViewModel(makeRide());
    expect(vm.driver).toBeDefined();
    expect(vm.driver!.id).toBe('rider-1');
    expect(vm.driver!.name).toBe('John Driver');
    expect(vm.driver!.vehicleNumber).toBe('ABC-123');
    expect(vm.driver!.vehicleBrand).toBe('Toyota');
    expect(vm.driver!.vehicleModel).toBe('Corolla');
  });

  it('maps rider.rating → driver.rating (number | null)', () => {
    const vm = mapRideToViewModel(makeRide());
    expect(vm.driver!.rating).toBe(4.8);
  });

  it('maps rider.rating = undefined → driver.rating = null', () => {
    const vm = mapRideToViewModel(
      makeRide({ rider: { id: 'r1', name: 'Jim', rating: undefined } }),
    );
    expect(vm.driver!.rating).toBeNull();
  });

  it('returns driver as undefined when rider is missing', () => {
    const vm = mapRideToViewModel(makeRide({ rider: undefined }));
    expect(vm.driver).toBeUndefined();
  });
});

// ─── Address construction ────────────────────────────────────────────────────
describe('Address construction', () => {
  it('constructs addressText from street, city, state', () => {
    const vm = mapRideToViewModel(makeRide());
    expect(vm.pickupAddress.addressText).toBe('10 Marina Rd, Lagos, Lagos');
  });

  it('falls back to "Pinned Location" for missing address parts', () => {
    const vm = mapRideToViewModel(makeRide({ pickupAddress: undefined }));
    expect(vm.pickupAddress.addressText).toBe('Pinned Location');
    expect(vm.pickupAddress.lat).toBeNull();
  });
});

// ─── Batch mapping ───────────────────────────────────────────────────────────
describe('mapRidesToViewModels', () => {
  it('maps an array of backend rides', () => {
    const rides = [makeRide({ id: 'a' }), makeRide({ id: 'b' })];
    const vms = mapRidesToViewModels(rides);
    expect(vms).toHaveLength(2);
    expect(vms[0].id).toBe('a');
    expect(vms[1].id).toBe('b');
  });
});

// ─── Coordinate validation ───────────────────────────────────────────────────
describe('hasValidCoordinates', () => {
  it('returns true for valid coordinates', () => {
    expect(hasValidCoordinates({ addressText: 'x', lat: 6.5, lng: 3.3 })).toBe(true);
  });

  it('returns false when lat is null', () => {
    expect(hasValidCoordinates({ addressText: 'x', lat: null, lng: 3.3 })).toBe(false);
  });

  it('returns false when lng is null', () => {
    expect(hasValidCoordinates({ addressText: 'x', lat: 6.5, lng: null })).toBe(false);
  });
});
