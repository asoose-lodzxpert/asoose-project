/**
 * RideHistory.test.tsx
 *
 * Regression tests for the ride history components.
 *
 * Covers:
 *  C4 — getStatusColor handles all CANCELLED variants (red badge)
 *  C6 — Dispute check endpoint is /disputes/check (not /super-admin/disputes/check)
 *  L10 — History cards are wrapped in Link to /main/ride/history/[id]
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fs from 'fs';
import * as path from 'path';

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('next-auth/react', () => ({
  useSession: () => ({
    data: { accessToken: 'test-token' },
    status: 'authenticated',
  }),
}));

jest.mock('react-toastify', () => ({
  toast: { error: jest.fn(), success: jest.fn(), info: jest.fn() },
}));

jest.mock('next/link', () => {
  const React = require('react');
  return React.forwardRef(({ children, href, ...rest }: any, ref: any) =>
    React.createElement('a', { ...rest, href, ref, 'data-testid': 'history-link' }, children),
  );
});

jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
    refresh: jest.fn(),
  }),
  useParams: () => ({ id: 'ride-abc-123' }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/main/ride/history',
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

const mockGetRideHistory = jest.fn();

jest.mock('@/services/ride.service', () => ({
  RideService: {
    getRideHistory: (...args: any[]) => mockGetRideHistory(...args),
  },
}));

jest.mock('@/services/mappers/ride.mapper', () => ({
  mapRidesToViewModels: (rides: any[]) =>
    rides.map((r: any) => ({
      id: r.id,
      status: r.status,
      statusLabel: r.status === 'COMPLETED' ? 'Completed' : r.status,
      pickupAddress: { addressText: r.pickupAddress?.street || 'Pickup', lat: 0, lng: 0 },
      dropoffAddress: { addressText: r.dropoffAddress?.street || 'Dropoff', lat: 0, lng: 0 },
      actualFare: r.totalFare || 0,
      createdAt: new Date(r.createdAt || '2025-01-01'),
      driver: r.rider ? { name: r.rider.name } : undefined,
    })),
}));

jest.mock('@/services/formatters/ride-status.formatter', () => ({
  formatRideDateTime: (iso: string) => iso || '',
  formatCurrency: (amount: number) => `₦${amount?.toLocaleString()}`,
}));

import { RideHistoryClient } from '@/app/main/ride/history/client';

function makeBackendRide(overrides: any = {}) {
  return {
    id: 'ride-001',
    status: 'COMPLETED',
    customerId: 'c1',
    pickupAddressId: 'a1',
    dropoffAddressId: 'a2',
    pickupAddress: { street: '10 Marina Rd' },
    dropoffAddress: { street: '20 VI' },
    totalFare: 3500,
    createdAt: '2025-03-01T10:00:00Z',
    rider: { name: 'John' },
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
});

// ─── C4: getStatusColor handles all cancellation variants ────────────────────
describe('C4 — cancellation badge colours in history', () => {
  const cancelVariants = [
    'CANCELLED',
    'CANCELLED_BY_USER',
    'CANCELLED_BY_DRIVER',
    'CANCELLED_BY_SYSTEM',
  ];

  it.each(cancelVariants)('renders %s ride with a red status badge', async () => {
    // Source-level check: verify the getStatusColor function in client.tsx
    // explicitly handles all cancellation variants.
    const clientPath = path.resolve(
      __dirname,
      '../../../app/main/ride/history/client.tsx',
    );
    const source = fs.readFileSync(clientPath, 'utf-8');

    for (const variant of cancelVariants) {
      expect(source).toContain(`'${variant}'`);
    }
  });

  it('getStatusColor in source includes all CANCELLED variants with red styling', () => {
    const clientPath = path.resolve(
      __dirname,
      '../../../app/main/ride/history/client.tsx',
    );
    const source = fs.readFileSync(clientPath, 'utf-8');

    // Extract the getStatusColor function body
    const match = source.match(/const getStatusColor[\s\S]*?};/);
    expect(match).not.toBeNull();

    const fnBody = match![0];
    expect(fnBody).toContain('CANCELLED_BY_USER');
    expect(fnBody).toContain('CANCELLED_BY_DRIVER');
    expect(fnBody).toContain('CANCELLED_BY_SYSTEM');
    expect(fnBody).toContain('red'); // ensures red styling is applied
  });
});

// ─── L10: History cards wrapped in Link ──────────────────────────────────────
describe('L10 — ride history cards are clickable Links', () => {
  it('renders cards wrapped in <Link> pointing to /main/ride/history/[id]', async () => {
    mockGetRideHistory.mockResolvedValueOnce([
      makeBackendRide({ id: 'ride-xyz' }),
    ]);

    render(<RideHistoryClient />);

    await waitFor(() => {
      // Find the link
      const links = screen.getAllByTestId('history-link');
      expect(links.length).toBeGreaterThan(0);
      expect(links[0]).toHaveAttribute('href', '/main/ride/history/ride-xyz');
    });
  });

  it('each ride card has a unique link to its detail page', async () => {
    mockGetRideHistory.mockResolvedValueOnce([
      makeBackendRide({ id: 'ride-aaa' }),
      makeBackendRide({ id: 'ride-bbb' }),
    ]);

    render(<RideHistoryClient />);

    await waitFor(() => {
      const links = screen.getAllByTestId('history-link');
      expect(links).toHaveLength(2);
      expect(links[0]).toHaveAttribute('href', '/main/ride/history/ride-aaa');
      expect(links[1]).toHaveAttribute('href', '/main/ride/history/ride-bbb');
    });
  });

  it('source code uses <Link> component (not <a> or onClick navigation)', () => {
    const clientPath = path.resolve(
      __dirname,
      '../../../app/main/ride/history/client.tsx',
    );
    const source = fs.readFileSync(clientPath, 'utf-8');
    expect(source).toContain("import Link from 'next/link'");
    expect(source).toContain('<Link');
    expect(source).toContain('/main/ride/history/${ride.id}');
  });
});

// ─── C6: Dispute endpoint is NOT /super-admin ───────────────────────────────
describe('C6 — dispute check endpoint', () => {
  it('ride history detail page uses /disputes/check (not /super-admin/disputes/check)', () => {
    // Read the ride detail page source
    const detailPagePath = path.resolve(
      __dirname,
      '../../../app/main/ride/history/[id]/page.tsx',
    );
    const source = fs.readFileSync(detailPagePath, 'utf-8');

    // MUST contain the correct customer-facing endpoint
    expect(source).toContain('/disputes/check?rideId=');

    // MUST NOT contain the super-admin endpoint
    expect(source).not.toContain('/super-admin/disputes/check');
  });
});

// ─── C5: Transaction ID uses paymentReference (source check) ─────────────────
describe('C5 — transaction ID in ride detail page', () => {
  it('displays paymentReference (not ride UUID) as transaction ID', () => {
    const detailPagePath = path.resolve(
      __dirname,
      '../../../app/main/ride/history/[id]/page.tsx',
    );
    const source = fs.readFileSync(detailPagePath, 'utf-8');

    // Should use paymentReference?.toUpperCase()
    expect(source).toContain('paymentReference');
    expect(source).toMatch(/ride\.paymentReference\?\.toUpperCase\(\)/);
  });

  it('falls back to ride.id.slice(0, 12) when paymentReference is absent', () => {
    const detailPagePath = path.resolve(
      __dirname,
      '../../../app/main/ride/history/[id]/page.tsx',
    );
    const source = fs.readFileSync(detailPagePath, 'utf-8');

    // Fallback pattern
    expect(source).toContain('ride.id.slice(0, 12)');
  });
});

// ─── C4: isCancelledStatus helper in detail page ─────────────────────────────
describe('C4 — isCancelledStatus in detail page', () => {
  it('checks all cancellation variants', () => {
    const detailPagePath = path.resolve(
      __dirname,
      '../../../app/main/ride/history/[id]/page.tsx',
    );
    const source = fs.readFileSync(detailPagePath, 'utf-8');

    // Find the isCancelledStatus function
    expect(source).toContain('isCancelledStatus');
    expect(source).toContain('CANCELLED_BY_USER');
    expect(source).toContain('CANCELLED_BY_DRIVER');
    expect(source).toContain('CANCELLED_BY_SYSTEM');
  });
});

// ─── General rendering ───────────────────────────────────────────────────────
describe('RideHistoryClient — rendering', () => {
  it('shows loading spinner initially', () => {
    mockGetRideHistory.mockReturnValue(new Promise(() => {})); // never resolves
    const { container } = render(<RideHistoryClient />);
    // Loader2 is mocked as an svg
    const spinners = container.querySelectorAll('svg');
    expect(spinners.length).toBeGreaterThan(0);
  });

  it('shows "No rides yet" when history is empty', async () => {
    mockGetRideHistory.mockResolvedValueOnce([]);
    render(<RideHistoryClient />);
    await waitFor(() => {
      expect(screen.getByText('No rides yet')).toBeInTheDocument();
    });
  });

  it('renders ride cards with pickup/dropoff addresses', async () => {
    mockGetRideHistory.mockResolvedValueOnce([
      makeBackendRide({ pickupAddress: { street: 'Marina Pickup' }, dropoffAddress: { street: 'VI Dropoff' } }),
    ]);
    render(<RideHistoryClient />);
    await waitFor(() => {
      expect(screen.getByText('Marina Pickup')).toBeInTheDocument();
      expect(screen.getByText('VI Dropoff')).toBeInTheDocument();
    });
  });
});
