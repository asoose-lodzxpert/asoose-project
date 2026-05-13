/**
 * Shared test mocks and helpers for ride tests.
 *
 * Provides:
 * - Mock next-auth/react (useSession)
 * - Mock react-toastify (toast)
 * - Mock next/navigation (useRouter, useParams)
 * - Mock socket.service (subscribeToRideEvents, socketService)
 * - Mock ride.service (RideService)
 * - Mock logger (devLog)
 * - Helper to reset the Zustand ride store between tests
 */

import type { BackendRide } from '@/types/ride-view-model';

// ── next-auth ────────────────────────────────────────────────────────────────
export const mockSession = {
  data: { accessToken: 'test-token', user: { id: 'user-1', name: 'Test User' } },
  status: 'authenticated' as const,
};

jest.mock('next-auth/react', () => ({
  useSession: jest.fn(() => mockSession),
  SessionProvider: ({ children }: any) => children,
}));

// ── react-toastify ──────────────────────────────────────────────────────────
jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
  },
}));

// ── next/navigation ─────────────────────────────────────────────────────────
const mockRouter = {
  push: jest.fn(),
  back: jest.fn(),
  replace: jest.fn(),
  refresh: jest.fn(),
  prefetch: jest.fn(),
};
jest.mock('next/navigation', () => ({
  useRouter: () => mockRouter,
  useParams: jest.fn(() => ({ id: 'ride-abc-123' })),
  useSearchParams: jest.fn(() => new URLSearchParams()),
  usePathname: jest.fn(() => '/main/ride'),
}));

// ── next/link ───────────────────────────────────────────────────────────────
jest.mock('next/link', () => {
  const React = require('react');
  return React.forwardRef(({ children, href, ...rest }: any, ref: any) =>
    React.createElement('a', { ...rest, href, ref, 'data-testid': 'next-link' }, children),
  );
});

// ── logger ──────────────────────────────────────────────────────────────────
jest.mock('@/lib/logger', () => ({
  devLog: jest.fn(),
}));

// ── google maps stub ────────────────────────────────────────────────────────
if (typeof window !== 'undefined' && !window.google) {
  (window as any).google = {
    maps: {
      Map: jest.fn(),
      LatLngLiteral: jest.fn(),
      Marker: jest.fn(),
      Polyline: jest.fn(),
      geometry: { encoding: { decodePath: jest.fn(() => []) } },
      DirectionsService: jest.fn(),
      TravelMode: { DRIVING: 'DRIVING' },
    },
  };
}

// ── @react-google-maps/api ──────────────────────────────────────────────────
jest.mock('@react-google-maps/api', () => ({
  GoogleMap: ({ children }: any) => {
    const React = require('react');
    return React.createElement('div', { 'data-testid': 'google-map' }, children);
  },
  Marker: () => null,
  Polyline: () => null,
}));

jest.mock('@/providers/GoogleMapsProvider', () => ({
  useGoogleMaps: () => ({ isLoaded: true }),
}));

// ── socket.service ──────────────────────────────────────────────────────────
export const mockSocketOn = jest.fn();
export const mockSocketOff = jest.fn();
export const mockSocketEmit = jest.fn();

jest.mock('@/services/socket.service', () => ({
  subscribeToRideEvents: jest.fn(),
  unsubscribeFromRideEvents: jest.fn(),
  socketService: {
    getSocket: jest.fn(() => ({
      on: mockSocketOn,
      off: mockSocketOff,
      emit: mockSocketEmit,
      connected: true,
    })),
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    isConnected: jest.fn(() => true),
  },
  // Re-export types so tests that need them can import from here
  DriverAcceptedEvent: {} as any,
  NoDriversFoundEvent: {} as any,
}));

// ── ride.service ────────────────────────────────────────────────────────────
export const mockRideService = {
  getEstimate: jest.fn(),
  createRide: jest.fn(),
  confirmRide: jest.fn(),
  getCurrentRide: jest.fn(),
  getRideById: jest.fn(),
  getVehicleTypes: jest.fn(),
  cancelRide: jest.fn(),
  getDriverLocation: jest.fn(),
  rateDriver: jest.fn(),
  getRideHistory: jest.fn(),
};

jest.mock('@/services/ride.service', () => ({
  RideService: mockRideService,
  RideStatus: {},
}));

// ── Store reset helper ──────────────────────────────────────────────────────
export function resetRideStore() {
  // Dynamically import to avoid circular deps
  const { useRideStore } = require('@/app/main/ride/store/ride');
  const state = useRideStore.getState();
  state.resetRide();
  // Also clear rideId and ensure truly idle
  useRideStore.setState({
    rideId: null,
    rideStatus: 'idle',
    driver: null,
    tripSummary: null,
    rating: null,
    feedback: '',
    paymentConfirmed: false,
    lockedEstimate: null,
    startOtp: null,
  });
}

// ── Factory: minimal backend ride ───────────────────────────────────────────
export function makeBackendRide(overrides: Partial<BackendRide> = {}): BackendRide {
  return {
    id: 'ride-abc-123',
    status: 'COMPLETED',
    customerId: 'customer-1',
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
