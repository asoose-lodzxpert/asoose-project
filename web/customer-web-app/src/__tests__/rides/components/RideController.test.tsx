/**
 * RideController.test.tsx
 *
 * Regression tests for the RideController component.
 *
 * Covers:
 *  C3 — PostDriverPayment component does NOT exist and is NOT imported.
 *        RideController imports PostRidePayment instead.
 *  General — correct component is rendered for each ride stage.
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fs from 'fs';
import * as path from 'path';

// ── Mock sub-components ─────────────────────────────────────────────────────
jest.mock('@/app/main/ride/components/RideSelection', () => ({
  RideSelection: () => <div data-testid="ride-selection">RideSelection</div>,
}));
jest.mock('@/app/main/ride/components/FindingDriver', () => ({
  FindingDriver: () => <div data-testid="finding-driver">FindingDriver</div>,
}));
jest.mock('@/app/main/ride/components/DriverArrived', () => ({
  DriverArrived: () => <div data-testid="driver-arrived">DriverArrived</div>,
}));
jest.mock('@/app/main/ride/components/TripInProgress', () => ({
  TripInProgress: () => <div data-testid="trip-in-progress">TripInProgress</div>,
}));
jest.mock('@/app/main/ride/components/RatingModal', () => ({
  RatingModal: () => <div data-testid="rating-modal">RatingModal</div>,
}));
jest.mock('@/app/main/ride/components/PostRidePayment', () => ({
  PostRidePayment: () => <div data-testid="post-ride-payment">PostRidePayment</div>,
}));
jest.mock('@/app/main/ride/components/LocationSelector', () => ({
  LocationSelector: () => <div data-testid="location-selector">LocationSelector</div>,
}));
jest.mock('@/app/main/ride/hooks/useReverseGeocoding', () => ({
  useReverseGeocoding: () => {},
}));

// Mock store with configurable state
let currentRideStatus = 'idle';
let currentIsConfiguring: string | null = null;

jest.mock('@/app/main/ride/store/ride', () => ({
  useRideStore: (selector: (state: any) => any) =>
    selector({
      rideStatus: currentRideStatus,
      isConfiguring: currentIsConfiguring,
    }),
}));

import { RideController } from '@/app/main/ride/components/RideController';

beforeEach(() => {
  currentRideStatus = 'idle';
  currentIsConfiguring = null;
});

// ─── C3: PostDriverPayment does NOT exist ────────────────────────────────────
describe('C3 — PostDriverPayment (dead component) removal', () => {
  it('PostDriverPayment.tsx file does NOT exist on disk', () => {
    const componentsDir = path.resolve(
      __dirname,
      '../../../app/main/ride/components',
    );
    const files = fs.readdirSync(componentsDir);
    expect(files).not.toContain('PostDriverPayment.tsx');
  });

  it('RideController.tsx source does NOT import PostDriverPayment', () => {
    const controllerPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/RideController.tsx',
    );
    const source = fs.readFileSync(controllerPath, 'utf-8');
    expect(source).not.toContain('PostDriverPayment');
  });

  it('RideController.tsx source DOES import PostRidePayment', () => {
    const controllerPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/RideController.tsx',
    );
    const source = fs.readFileSync(controllerPath, 'utf-8');
    expect(source).toContain('PostRidePayment');
  });
});

// ─── C3 (extended): Removed dead components do not exist ─────────────────────
describe('C3 — All dead components removed', () => {
  const deadComponents = [
    'PostDriverPayment.tsx',
    'TripComplete.tsx',
    'RideInterface.tsx',
    'Map.tsx',
    'RideDetails.tsx',
  ];

  const componentsDir = path.resolve(
    __dirname,
    '../../../app/main/ride/components',
  );

  it.each(deadComponents)('%s does NOT exist', (filename) => {
    const fullPath = path.join(componentsDir, filename);
    expect(fs.existsSync(fullPath)).toBe(false);
  });
});

// ─── RideController switch rendering ─────────────────────────────────────────
describe('RideController — renders correct component per stage', () => {
  it('renders RideSelection for "idle"', () => {
    currentRideStatus = 'idle';
    render(<RideController />);
    expect(screen.getByTestId('ride-selection')).toBeInTheDocument();
  });

  it('renders FindingDriver for "searching"', () => {
    currentRideStatus = 'searching';
    render(<RideController />);
    expect(screen.getByTestId('finding-driver')).toBeInTheDocument();
  });

  it('renders DriverArrived for "confirmed"', () => {
    currentRideStatus = 'confirmed';
    render(<RideController />);
    expect(screen.getByTestId('driver-arrived')).toBeInTheDocument();
  });

  it('renders DriverArrived for "arrived"', () => {
    currentRideStatus = 'arrived';
    render(<RideController />);
    expect(screen.getByTestId('driver-arrived')).toBeInTheDocument();
  });

  it('renders TripInProgress for "in-progress"', () => {
    currentRideStatus = 'in-progress';
    render(<RideController />);
    expect(screen.getByTestId('trip-in-progress')).toBeInTheDocument();
  });

  it('renders PostRidePayment for "payment-required"', () => {
    currentRideStatus = 'payment-required';
    render(<RideController />);
    expect(screen.getByTestId('post-ride-payment')).toBeInTheDocument();
  });

  it('renders RatingModal for "finished"', () => {
    currentRideStatus = 'finished';
    render(<RideController />);
    expect(screen.getByTestId('rating-modal')).toBeInTheDocument();
  });

  it('renders LocationSelector when isConfiguring is set', () => {
    currentIsConfiguring = 'pickup';
    render(<RideController />);
    expect(screen.getByTestId('location-selector')).toBeInTheDocument();
  });
});
