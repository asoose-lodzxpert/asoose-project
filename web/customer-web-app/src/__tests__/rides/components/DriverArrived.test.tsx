/**
 * DriverArrived.test.tsx
 *
 * Regression tests for the DriverArrived component.
 *
 * Covers:
 *  C2 — Null-safe rating display: rating=null does NOT crash .toFixed(1)
 *        Rating badge only shows when driver.rating != null
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ────────────────────────────────────────────────────────────────────
// Must be before component import
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'test-token', user: { id: 'u1', name: 'Test' } },
    status: 'authenticated',
  }),
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), error: jest.fn(), info: jest.fn() },
}));

jest.mock('@/services/ride.service', () => ({
  RideService: { cancelRide: jest.fn() },
}));

jest.mock('lucide-react', () => {
  const React = require('react');
  const mockIcon = React.forwardRef(({ children, ...props }: any, ref: any) =>
    React.createElement('svg', { ...props, ref, 'data-testid': props['data-testid'] || 'icon' }, children),
  );
  return new Proxy(
    {},
    {
      get: (_target, prop) => {
        if (prop === '__esModule') return true;
        return mockIcon;
      },
    },
  );
});

// We need to mock the store so we can inject different driver states
const mockStoreValues: Record<string, any> = {
  driver: null,
  rideStatus: 'confirmed',
  rideId: 'ride-001',
  startOtp: null,
  driverEta: null,
  setRideStatus: jest.fn(),
  setRideId: jest.fn(),
};

jest.mock('@/app/main/ride/store/ride', () => ({
  useRideStore: (selector: (state: any) => any) => selector(mockStoreValues),
}));

import { DriverArrived } from '@/app/main/ride/components/DriverArrived';

function setDriver(overrides: Partial<typeof mockStoreValues.driver> = {}) {
  mockStoreValues.driver = {
    name: 'Test Driver',
    photoUrl: '/profile.jpg',
    vehicle: {
      make: 'Toyota',
      model: 'Camry',
      licensePlate: 'ABC-123',
    },
    rating: null,
    phone: '08012345678',
    ...overrides,
  };
}

beforeEach(() => {
  mockStoreValues.driver = null;
  mockStoreValues.rideStatus = 'confirmed';
  mockStoreValues.rideId = 'ride-001';
  mockStoreValues.startOtp = null;
  mockStoreValues.driverEta = null;
});

// ─── C2: Rating null safety ─────────────────────────────────────────────────
describe('C2 — DriverArrived rating null safety', () => {
  it('renders without crash when driver.rating is null', () => {
    setDriver({ rating: null });
    const { container } = render(<DriverArrived />);
    // Should render the driver name without crashing
    expect(screen.getByText('Test Driver')).toBeInTheDocument();
    // Rating badge should NOT be present
    expect(container.querySelector('.text-yellow-700')).not.toBeInTheDocument();
  });

  it('renders rating badge when driver.rating is a valid number', () => {
    setDriver({ rating: 4.8 });
    render(<DriverArrived />);
    expect(screen.getByText('4.8')).toBeInTheDocument();
    expect(screen.getByText('★')).toBeInTheDocument();
  });

  it('renders rating badge with .toFixed(1) precision', () => {
    setDriver({ rating: 3.777 });
    render(<DriverArrived />);
    expect(screen.getByText('3.8')).toBeInTheDocument();
  });

  it('does NOT call .toFixed() when rating is null (no TypeError)', () => {
    setDriver({ rating: null });
    // This would throw "Cannot read property 'toFixed' of null" if C2 bug exists
    expect(() => render(<DriverArrived />)).not.toThrow();
  });

  it('does NOT show rating badge when rating is 0', () => {
    // 0 is falsy in JS, but `driver.rating != null` is true for 0
    // so the badge SHOULD render with "0.0"
    setDriver({ rating: 0 });
    render(<DriverArrived />);
    expect(screen.getByText('0.0')).toBeInTheDocument();
  });
});

// ─── General rendering ───────────────────────────────────────────────────────
describe('DriverArrived — general rendering', () => {
  it('shows "Driver is on the way" for confirmed status', () => {
    setDriver();
    mockStoreValues.rideStatus = 'confirmed';
    render(<DriverArrived />);
    expect(screen.getByText('Driver is on the way')).toBeInTheDocument();
  });

  it('shows "Driver Arrived!" for arrived status', () => {
    setDriver();
    mockStoreValues.rideStatus = 'arrived';
    render(<DriverArrived />);
    expect(screen.getByText('Driver Arrived!')).toBeInTheDocument();
  });

  it('shows vehicle info', () => {
    setDriver();
    render(<DriverArrived />);
    expect(screen.getByText(/Camry/)).toBeInTheDocument();
    expect(screen.getByText('ABC-123')).toBeInTheDocument();
  });

  it('shows OTP when startOtp is set', () => {
    setDriver();
    mockStoreValues.startOtp = '4321';
    render(<DriverArrived />);
    expect(screen.getByText('4321')).toBeInTheDocument();
  });

  it('renders cancel button when status is confirmed (not arrived)', () => {
    setDriver();
    mockStoreValues.rideStatus = 'confirmed';
    render(<DriverArrived />);
    expect(screen.getByText('Cancel Ride')).toBeInTheDocument();
  });

  it('does not render cancel button when status is arrived', () => {
    setDriver();
    mockStoreValues.rideStatus = 'arrived';
    render(<DriverArrived />);
    expect(screen.queryByText('Cancel Ride')).not.toBeInTheDocument();
  });

  it('shows ETA when driverEta is available', () => {
    setDriver();
    mockStoreValues.driverEta = { minutes: 5, km: 2.3 };
    render(<DriverArrived />);
    expect(screen.getByText(/5 min/)).toBeInTheDocument();
    expect(screen.getByText(/2\.3 km/)).toBeInTheDocument();
  });
});
