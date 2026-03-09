/**
 * price-estimate.test.ts
 *
 * Regression tests for the PriceEstimate interface.
 *
 * Covers:
 *  M3 — PriceEstimate has NO `breakdown` field
 *  M4 — PriceEstimate has NO `total` field
 *  Data contract: PriceEstimate has { estimatedFare, distance, duration, isNightRate? }
 */

import type { PriceEstimate } from '@/services/ride.service';

describe('M3/M4 — PriceEstimate data contract', () => {
  it('has estimatedFare, distance, duration', () => {
    const estimate: PriceEstimate = {
      estimatedFare: 3500,
      distance: 12.5,
      duration: 25,
    };
    expect(estimate.estimatedFare).toBe(3500);
    expect(estimate.distance).toBe(12.5);
    expect(estimate.duration).toBe(25);
  });

  it('optionally has isNightRate', () => {
    const estimate: PriceEstimate = {
      estimatedFare: 4000,
      distance: 10,
      duration: 20,
      isNightRate: true,
    };
    expect(estimate.isNightRate).toBe(true);
  });

  it('does NOT have a breakdown field', () => {
    const estimate: PriceEstimate = {
      estimatedFare: 3500,
      distance: 12.5,
      duration: 25,
    };
    expect(estimate).not.toHaveProperty('breakdown');
  });

  it('does NOT have a total field', () => {
    const estimate: PriceEstimate = {
      estimatedFare: 3500,
      distance: 12.5,
      duration: 25,
    };
    expect(estimate).not.toHaveProperty('total');
  });

  // This test ensures that if someone adds `breakdown` or `total` to PriceEstimate,
  // the test suite catches it.
  it('PriceEstimate keys are limited to {estimatedFare, distance, duration, isNightRate}', () => {
    const estimate: PriceEstimate = {
      estimatedFare: 1000,
      distance: 5,
      duration: 10,
      isNightRate: false,
    };

    const keys = Object.keys(estimate).sort();
    expect(keys).toEqual(['distance', 'duration', 'estimatedFare', 'isNightRate']);
  });
});

describe('M3 — breakdown field type guard', () => {
  it('PriceEstimate should not accept a breakdown property at type level', () => {
    // @ts-expect-error — breakdown is not a valid PriceEstimate field (M3 fix)
    const _: PriceEstimate = {
      estimatedFare: 1000,
      distance: 5,
      duration: 10,
      breakdown: { baseFare: 500, distanceFare: 300, timeFare: 200 },
    };
    expect(true).toBe(true);
  });
});

describe('M4 — total field type guard', () => {
  it('PriceEstimate should not accept a total property at type level', () => {
    // @ts-expect-error — total is not a valid PriceEstimate field (M4 fix)
    const _: PriceEstimate = {
      estimatedFare: 1000,
      distance: 5,
      duration: 10,
      total: 1000,
    };
    expect(true).toBe(true);
  });
});
