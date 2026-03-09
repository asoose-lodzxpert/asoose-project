/**
 * PostRidePayment.test.tsx
 *
 * Regression tests for the PostRidePayment component.
 *
 * Covers:
 *  H3 — ALREADY_PAID response is handled gracefully:
 *        - toast info is shown
 *        - paymentConfirmed is set to true
 *        - rideStatus transitions to "finished"
 *        - no Paystack redirect occurs
 */

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import { toast } from 'react-toastify';

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'test-token' },
    status: 'authenticated',
  }),
}));

jest.mock('react-toastify', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
  },
}));

jest.mock('lucide-react', () => {
  const React = require('react');
  const mockIcon = React.forwardRef((props: any, ref: any) =>
    React.createElement('svg', { ...props, ref }),
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

const mockConfirmRide = jest.fn();

jest.mock('@/services/ride.service', () => ({
  RideService: {
    confirmRide: (...args: any[]) => mockConfirmRide(...args),
  },
}));

const mockSetPaymentConfirmed = jest.fn();
const mockSetRideStatus = jest.fn();

const mockStoreValues: Record<string, any> = {
  rideId: 'ride-001',
  tripSummary: { fare: 3500, distance: 12.5, duration: 25 },
  lockedEstimate: null,
  setPaymentConfirmed: mockSetPaymentConfirmed,
};

jest.mock('@/app/main/ride/store/ride', () => ({
  useRideStore: Object.assign(
    (selector: (state: any) => any) => selector(mockStoreValues),
    {
      getState: () => ({
        setRideStatus: mockSetRideStatus,
      }),
    },
  ),
}));

import { PostRidePayment } from '@/app/main/ride/components/PostRidePayment';

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreValues.rideId = 'ride-001';
  mockStoreValues.tripSummary = { fare: 3500, distance: 12.5, duration: 25 };
  mockStoreValues.lockedEstimate = null;
});

// ─── H3: ALREADY_PAID handling ──────────────────────────────────────────────
describe('H3 — PostRidePayment ALREADY_PAID handling', () => {
  it('handles ALREADY_PAID response: shows toast, sets confirmed, transitions to finished', async () => {
    mockConfirmRide.mockResolvedValueOnce({
      rideId: 'ride-001',
      authorizationUrl: 'https://paystack.com/pay/123',
      reference: 'ref-123',
      status: 'ALREADY_PAID',
    });

    render(<PostRidePayment />);

    // Find and click the Pay button
    const payButton = screen.getByRole('button', { name: /Pay/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      // Should show info toast
      expect(toast.info).toHaveBeenCalledWith('Payment was already completed.');
      // Should set paymentConfirmed to true
      expect(mockSetPaymentConfirmed).toHaveBeenCalledWith(true);
      // Should transition to finished
      expect(mockSetRideStatus).toHaveBeenCalledWith('finished');
    });
  });

  it('does NOT set paymentConfirmed before confirmRide resolves', () => {
    // Confirm ride never resolves
    mockConfirmRide.mockReturnValue(new Promise(() => {}));

    render(<PostRidePayment />);
    const payButton = screen.getByRole('button', { name: /Pay/i });
    fireEvent.click(payButton);

    // Should not have been called yet
    expect(mockSetPaymentConfirmed).not.toHaveBeenCalled();
    expect(mockSetRideStatus).not.toHaveBeenCalled();
  });

  it('ALREADY_PAID response prevents setting localStorage pending_ride', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    mockConfirmRide.mockResolvedValueOnce({
      rideId: 'ride-001',
      authorizationUrl: 'https://paystack.com/pay/123',
      reference: 'ref-123',
      status: 'ALREADY_PAID',
    });

    render(<PostRidePayment />);
    const payButton = screen.getByRole('button', { name: /Pay/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith('Payment was already completed.');
    });

    // localStorage should NOT have pending_ride set (since ALREADY_PAID short-circuits)
    expect(setItemSpy).not.toHaveBeenCalledWith('pending_ride', 'true');
    setItemSpy.mockRestore();
  });

  it('non-ALREADY_PAID response sets localStorage pending_ride', async () => {
    const setItemSpy = jest.spyOn(Storage.prototype, 'setItem');

    mockConfirmRide.mockResolvedValueOnce({
      rideId: 'ride-001',
      authorizationUrl: 'https://paystack.com/pay/456',
      reference: 'ref-456',
      // No status = normal flow
    });

    render(<PostRidePayment />);
    const payButton = screen.getByRole('button', { name: /Pay/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      // Normal flow sets pending_ride in localStorage before redirect
      expect(setItemSpy).toHaveBeenCalledWith('pending_ride', 'true');
      expect(setItemSpy).toHaveBeenCalledWith('pending_ride_id', 'ride-001');
    });

    setItemSpy.mockRestore();
  });
});

// ─── H3: Source-level verification ──────────────────────────────────────────
describe('H3 — source code confirmation', () => {
  it('PostRidePayment source checks for ALREADY_PAID status', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/PostRidePayment.tsx',
    );
    const source = fs.readFileSync(componentPath, 'utf-8');

    expect(source).toContain('ALREADY_PAID');
    expect(source).toContain('confirmRes.status === "ALREADY_PAID"');
  });

  it('ALREADY_PAID branch calls setRideStatus("finished")', () => {
    const fs = require('fs');
    const path = require('path');
    const componentPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/PostRidePayment.tsx',
    );
    const source = fs.readFileSync(componentPath, 'utf-8');

    // After ALREADY_PAID check, the code should call setRideStatus("finished")
    const alreadyPaidIdx = source.indexOf('ALREADY_PAID');
    const afterIdx = source.indexOf('setRideStatus("finished")', alreadyPaidIdx);
    expect(afterIdx).toBeGreaterThan(alreadyPaidIdx);
  });
});

// ─── General rendering ───────────────────────────────────────────────────────
describe('PostRidePayment — rendering', () => {
  it('displays trip fare from tripSummary', () => {
    render(<PostRidePayment />);
    const matches = screen.getAllByText(/3,500/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Trip Complete!" heading', () => {
    render(<PostRidePayment />);
    expect(screen.getByText('Trip Complete!')).toBeInTheDocument();
  });

  it('shows distance and duration from tripSummary', () => {
    render(<PostRidePayment />);
    expect(screen.getByText('12.5 km')).toBeInTheDocument();
    expect(screen.getByText('25 min')).toBeInTheDocument();
  });

  it('falls back to lockedEstimate when tripSummary is null', () => {
    mockStoreValues.tripSummary = null;
    mockStoreValues.lockedEstimate = { fare: 2000, distance: 8.0, duration: 15 };
    render(<PostRidePayment />);
    const matches = screen.getAllByText(/2,000/);
    expect(matches.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('8.0 km')).toBeInTheDocument();
    expect(screen.getByText('15 min')).toBeInTheDocument();
  });

  it('shows Pay button', () => {
    render(<PostRidePayment />);
    expect(screen.getByRole('button', { name: /Pay/i })).toBeInTheDocument();
  });

  it('shows an error toast when confirmRide throws', async () => {
    mockConfirmRide.mockRejectedValueOnce(new Error('Network error'));

    render(<PostRidePayment />);
    const payButton = screen.getByRole('button', { name: /Pay/i });
    fireEvent.click(payButton);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalled();
    });
  });
});
