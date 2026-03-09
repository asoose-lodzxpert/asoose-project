/**
 * RatingModal.test.tsx
 *
 * Regression tests for the RatingModal component.
 *
 * Covers:
 *  H5 — RatingModal has a "Skip" button to dismiss without rating
 *  L7 — Skip button resets ride state (calls resetRide)
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'test-token' },
    status: 'authenticated',
  }),
}));

jest.mock('react-toastify', () => ({
  toast: { success: jest.fn(), info: jest.fn(), error: jest.fn() },
}));

jest.mock('@/services/ride.service', () => ({
  RideService: { rateDriver: jest.fn() },
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

const mockResetRide = jest.fn();
const mockSetRating = jest.fn();
const mockSetFeedback = jest.fn();

const mockStoreValues: Record<string, any> = {
  rideId: 'ride-001',
  rating: null,
  setRating: mockSetRating,
  feedback: '',
  setFeedback: mockSetFeedback,
  resetRide: mockResetRide,
};

jest.mock('@/app/main/ride/store/ride', () => ({
  useRideStore: (selector: (state: any) => any) => selector(mockStoreValues),
}));

import { RatingModal } from '@/app/main/ride/components/RatingModal';

beforeEach(() => {
  jest.clearAllMocks();
  mockStoreValues.rideId = 'ride-001';
  mockStoreValues.rating = null;
  mockStoreValues.feedback = '';
});

// ─── H5: Skip button exists ─────────────────────────────────────────────────
describe('H5 — RatingModal has Skip button', () => {
  it('renders a "Skip" button', () => {
    render(<RatingModal />);
    const skipButton = screen.getByText('Skip');
    expect(skipButton).toBeInTheDocument();
    expect(skipButton.tagName).toBe('BUTTON');
  });

  it('Skip button is not disabled when not submitting', () => {
    render(<RatingModal />);
    const skipButton = screen.getByText('Skip');
    expect(skipButton).not.toBeDisabled();
  });
});

// ─── L7: Skip calls resetRide ───────────────────────────────────────────────
describe('L7 — Skip button resets ride', () => {
  it('calls resetRide when Skip is clicked', () => {
    render(<RatingModal />);
    const skipButton = screen.getByText('Skip');
    fireEvent.click(skipButton);
    expect(mockResetRide).toHaveBeenCalledTimes(1);
  });
});

// ─── General rendering ───────────────────────────────────────────────────────
describe('RatingModal — general rendering', () => {
  it('renders "Rate your Driver" heading', () => {
    render(<RatingModal />);
    expect(screen.getByText('Rate your Driver')).toBeInTheDocument();
  });

  it('renders 5 star buttons', () => {
    render(<RatingModal />);
    // Each star is a button
    const buttons = screen.getAllByRole('button');
    // 5 stars + Submit + Skip = 7 buttons
    expect(buttons.length).toBeGreaterThanOrEqual(7);
  });

  it('Submit button is disabled when no rating is selected', () => {
    render(<RatingModal />);
    const submitButton = screen.getByText('Submit Review');
    expect(submitButton).toBeDisabled();
  });

  it('Submit button is enabled when a rating is selected', () => {
    mockStoreValues.rating = 4;
    render(<RatingModal />);
    const submitButton = screen.getByText('Submit Review');
    expect(submitButton).not.toBeDisabled();
  });

  it('renders a textarea for feedback', () => {
    render(<RatingModal />);
    const textarea = screen.getByPlaceholderText(/Leave a comment/i);
    expect(textarea).toBeInTheDocument();
  });

  it('clicking a star calls setRating', () => {
    render(<RatingModal />);
    // Get all buttons and click the 3rd star (5 stars + submit + skip)
    const buttons = screen.getAllByRole('button');
    // Stars are the first 5 buttons
    fireEvent.click(buttons[2]); // 3rd star
    expect(mockSetRating).toHaveBeenCalledWith(3);
  });
});
