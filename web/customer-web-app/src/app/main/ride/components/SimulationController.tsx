'use client';

import { useEffect, useRef, useState } from 'react';
import { useRideStore } from '../store/ride';

// CONSTANTS
const SEARCH_DELAY_MS = 3000;
const MOCK_SPEED_KMH = 120; // Fast speed for testing


// Example: Real-time driver tracking using polling (replace with WebSocket for true real-time)
import { RideService } from '@/services/ride.service';

export function SimulationController() {
  // Only run in development — this component polls driver location via REST
  // as a testing aid and should never be active in production builds.
  if (process.env.NODE_ENV === 'production') return null;

  const rideStatus = useRideStore((s) => s.rideStatus);
  const rideId = useRideStore((s) => s.rideId);
  const setDriverLocation = useRideStore((s) => s.setDriverLocation);
  const { data: session } = { data: { accessToken: undefined } }; // Replace with useSession() if available

  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if ((rideStatus === 'confirmed' || rideStatus === 'in-progress') && typeof rideId === 'string' && session?.accessToken) {
      // Poll every 3 seconds for driver location
      const fetchDriverLocation = async () => {
        try {
          const driverLoc = await RideService.getDriverLocation(rideId, session.accessToken);
          if (driverLoc && typeof driverLoc.latitude === 'number' && typeof driverLoc.longitude === 'number') {
            setDriverLocation({ lat: driverLoc.latitude, lng: driverLoc.longitude });
          }
        } catch (e) {
          // Optionally handle error
        }
      };
      fetchDriverLocation();
      interval = setInterval(fetchDriverLocation, 3000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [rideStatus, rideId, setDriverLocation, session?.accessToken]);

  return null;
}