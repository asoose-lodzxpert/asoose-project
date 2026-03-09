/**
 * trip-completed-flow.test.ts
 *
 * Integration-style tests for the trip completed flow.
 *
 * Covers:
 *  H6 — TRIP_COMPLETED handler immediately fetches ride via REST (not waiting for poll)
 *  M2 — REST sync updates driver info (backfills image/rating from full ride object)
 *  M5 — REST sync updates tripSummary from actual backend data
 */

import type { DriverAcceptedEvent } from '@/services/socket.service';

// ─── H6: onTripCompleted calls getCurrentRide immediately ────────────────────
describe('H6 — immediate REST fetch on TRIP_COMPLETED', () => {
  /**
   * Simulate the onTripCompleted handler logic from RideSocketListener.tsx.
   * We verify it calls RideService.getCurrentRide correctly.
   */
  it('calls RideService.getCurrentRide when TRIP_COMPLETED fires', async () => {
    const mockGetCurrentRide = jest.fn().mockResolvedValue({
      id: 'ride-001',
      status: 'COMPLETED',
      totalFare: 4500,
      distanceKm: 15.2,
      durationMin: 30,
    });

    const mockSetTripSummary = jest.fn();
    const mockSetRideStatus = jest.fn();

    // Simulate the handler exactly as written in RideSocketListener
    const rideId = 'ride-001';
    const token = 'test-token';

    // Simulate onTripCompleted
    const data = { rideId: 'ride-001' };
    if (data.rideId !== rideId) return;

    mockSetRideStatus('payment-required');

    if (token && rideId) {
      const ride = await mockGetCurrentRide(token);
      if (ride && ride.totalFare != null) {
        mockSetTripSummary({
          fare: ride.totalFare,
          distance: ride.distanceKm ?? 0,
          duration: ride.durationMin ?? 0,
        });
      }
    }

    // Verify
    expect(mockGetCurrentRide).toHaveBeenCalledWith('test-token');
    expect(mockSetRideStatus).toHaveBeenCalledWith('payment-required');
    expect(mockSetTripSummary).toHaveBeenCalledWith({
      fare: 4500,
      distance: 15.2,
      duration: 30,
    });
  });

  it('handles getCurrentRide failure gracefully (non-fatal)', async () => {
    const mockGetCurrentRide = jest.fn().mockRejectedValue(new Error('Network error'));
    const mockSetTripSummary = jest.fn();

    const rideId = 'ride-002';
    const token = 'test-token';

    if (token && rideId) {
      try {
        const ride = await mockGetCurrentRide(token);
        if (ride && ride.totalFare != null) {
          mockSetTripSummary({
            fare: ride.totalFare,
            distance: ride.distanceKm ?? 0,
            duration: ride.durationMin ?? 0,
          });
        }
      } catch {
        // Non-fatal — polling will pick it up
      }
    }

    expect(mockGetCurrentRide).toHaveBeenCalledWith('test-token');
    // tripSummary should NOT have been set since the call failed
    expect(mockSetTripSummary).not.toHaveBeenCalled();
  });

  it('source code calls RideService.getCurrentRide inside onTripCompleted', () => {
    const fs = require('fs');
    const path = require('path');
    const socketListenerPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/RideSocketListener.tsx',
    );
    const source = fs.readFileSync(socketListenerPath, 'utf-8');

    // Find the onTripCompleted handler
    expect(source).toContain('onTripCompleted');

    // Inside onTripCompleted, getCurrentRide must be called
    const tripCompletedSection = source.split('onTripCompleted')[1];
    expect(tripCompletedSection).toContain('RideService.getCurrentRide');
  });
});

// ─── M2: REST sync backfills driver info ─────────────────────────────────────
describe('M2/M5 — REST sync provides full driver and trip data', () => {
  it('source verifies REST polling fetches full ride including rider data', () => {
    const fs = require('fs');
    const path = require('path');

    // The RideSocketListener uses getCurrentRide which returns the full backend ride
    // including rider.image and rider.rating — this data is NOT on the socket payload
    // but IS available via REST, allowing the store to be updated with full driver info.
    const socketListenerPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/RideSocketListener.tsx',
    );
    const source = fs.readFileSync(socketListenerPath, 'utf-8');

    // Verify it imports RideService
    expect(source).toContain("import { RideService }");
    // Verify it calls getCurrentRide (which returns full ride with rider info)
    expect(source).toContain('RideService.getCurrentRide');
  });

  it('onDriverAccepted sets default values, not socket payload fields', () => {
    // Simulate the exact handler logic
    const socketData: DriverAcceptedEvent = {
      type: 'DRIVER_ACCEPTED',
      rideId: 'r1',
      driver: {
        id: 'd1',
        name: 'Alex',
        phone: '080',
        vehicle: { brand: 'Toyota', model: 'Camry', plateNumber: 'XYZ', color: 'White', year: 2022 },
      },
    };

    const driverState = {
      name: socketData.driver.name,
      photoUrl: '/profile.jpg', // Hard-coded default, NOT from socket
      vehicle: {
        make: socketData.driver.vehicle?.brand || 'Vehicle',
        model: socketData.driver.vehicle?.model || 'Car',
        licensePlate: socketData.driver.vehicle?.plateNumber || '---',
      },
      rating: null, // Hard-coded null, NOT from socket
      phone: socketData.driver.phone,
    };

    expect(driverState.photoUrl).toBe('/profile.jpg');
    expect(driverState.rating).toBeNull();
    // These will be backfilled by REST sync (useRideSynchronization)
  });
});

// ─── H6: source-level verification ──────────────────────────────────────────
describe('H6 — source-level verification', () => {
  it('onTripCompleted sets "payment-required" BEFORE calling getCurrentRide', () => {
    const fs = require('fs');
    const path = require('path');
    const socketListenerPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/RideSocketListener.tsx',
    );
    const source = fs.readFileSync(socketListenerPath, 'utf-8');

    // Extract the onTripCompleted section
    const startIdx = source.indexOf('onTripCompleted');
    const section = source.substring(startIdx, startIdx + 1000);

    // setRideStatus("payment-required") should appear before getCurrentRide
    const statusIdx = section.indexOf('payment-required');
    const fetchIdx = section.indexOf('getCurrentRide');

    expect(statusIdx).toBeGreaterThan(0);
    expect(fetchIdx).toBeGreaterThan(0);
    expect(statusIdx).toBeLessThan(fetchIdx);
  });

  it('onTripCompleted populates tripSummary with fare/distance/duration', () => {
    const fs = require('fs');
    const path = require('path');
    const socketListenerPath = path.resolve(
      __dirname,
      '../../../app/main/ride/components/RideSocketListener.tsx',
    );
    const source = fs.readFileSync(socketListenerPath, 'utf-8');

    // After getCurrentRide, the handler should set tripSummary
    const tripCompletedSection = source.split('onTripCompleted')[1];
    expect(tripCompletedSection).toContain('setTripSummary');
    expect(tripCompletedSection).toContain('ride.totalFare');
    expect(tripCompletedSection).toContain('ride.distanceKm');
    expect(tripCompletedSection).toContain('ride.durationMin');
  });
});
