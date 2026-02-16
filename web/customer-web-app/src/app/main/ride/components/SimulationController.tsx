'use client';

import { useEffect, useRef, useState } from 'react';
import { useRideStore } from '../store/ride';

// CONSTANTS
const SEARCH_DELAY_MS = 3000;
const MOCK_SPEED_KMH = 120; // Fast speed for testing

export function SimulationController() {
  // GRANULAR SELECTORS
  const rideStatus = useRideStore((s) => s.rideStatus);
  const pickupLocation = useRideStore((s) => s.pickupLocation);
  const dropoffLocation = useRideStore((s) => s.dropoffLocation);
  const driverLocation = useRideStore((s) => s.driverLocation);
  
  // FIX: Select the loading state from the store
  const isGoogleMapsLoaded = useRideStore((s) => s.isGoogleMapsLoaded);
  
  // ACTIONS
  const setDriver = useRideStore((s) => s.setDriver);
  const setDriverLocation = useRideStore((s) => s.setDriverLocation);
  const setRideStatus = useRideStore((s) => s.setRideStatus);
  const setTripSummary = useRideStore((s) => s.setTripSummary);

  // Animation State
  const [activePath, setActivePath] = useState<google.maps.LatLng[]>([]);
  const [isPathLoaded, setIsPathLoaded] = useState(false);
  const progressRef = useRef({ segmentIndex: 0, segmentProgress: 0, lastFrameTime: 0 });
  const animationFrameId = useRef<number | null>(null);
  const isPausedRef = useRef(false);

  // LOGGING UTILITY
  const log = (msg: string, data?: any) => {
    console.log(`%c[SIM] ${msg}`, 'background: #222; color: #bada55', data || '');
  };

  // 0. MOUNT CHECK
  useEffect(() => {
    log('Controller MOUNTED. Current Status:', rideStatus);
    return () => log('Controller UNMOUNTED');
  }, []);

  // 1. PHASE: SEARCHING -> CONFIRMED
  useEffect(() => {
    if (rideStatus === 'searching') {
      log('Starting Search Timer (3s)...');
      
      if (!pickupLocation) {
        console.error('[SIM] Critical: No pickup location in store!');
        return;
      }

      const timer = setTimeout(() => {
        log('Timer Fired: Finding Driver');
        
        const mockDriver = {
          name: 'Michael K.',
          photoUrl: 'https://i.pravatar.cc/150?u=driver',
          rating: 4.9,
          vehicle: { make: 'Toyota', model: 'Camry', licensePlate: 'MOCK-123' }
        };

        const spawnPoint = {
          lat: pickupLocation.lat - 0.005,
          lng: pickupLocation.lng - 0.005
        };

        setDriver(mockDriver);
        setDriverLocation(spawnPoint);
        setRideStatus('confirmed');
        
        log('Driver Assigned & Status set to CONFIRMED');
      }, SEARCH_DELAY_MS);

      return () => {
        log('Search Timer Cleaned up');
        clearTimeout(timer);
      };
    }
  }, [rideStatus, pickupLocation, setDriver, setDriverLocation, setRideStatus]);

  // 2. PHASE: ARRIVED (WAIT FOR USER)
  useEffect(() => {
    if (rideStatus === 'arrived') {
       // Pause and wait for user interaction (Confirm Pickup)
       isPausedRef.current = true;
    }
  }, [rideStatus]);

  // 3. ROUTING LOGIC (Only runs when entering a moving phase)
  useEffect(() => {
    const isMovingState = rideStatus === 'confirmed' || rideStatus === 'in-progress';
    
    // FIX: Strict check ensures Google Maps is fully loaded before constructor access
    if (
      !isMovingState || 
      !pickupLocation || 
      !dropoffLocation || 
      !isGoogleMapsLoaded || 
      !window.google?.maps
    ) {
      return;
    }

    const directionsService = new google.maps.DirectionsService();

    const fetchRoute = () => {
      log(`Fetching Route for phase: ${rideStatus}`);
      
      let origin: google.maps.LatLngLiteral | null = null;
      let destination: google.maps.LatLngLiteral | null = null;

      if (rideStatus === 'confirmed') {
        origin = driverLocation || { lat: pickupLocation.lat - 0.005, lng: pickupLocation.lng - 0.005 };
        destination = pickupLocation;
      } else if (rideStatus === 'in-progress') {
        // Resume from current driver location if available
        origin = driverLocation || pickupLocation;
        destination = dropoffLocation;
      }

      if (!origin || !destination) return;

      directionsService.route(
        {
          origin,
          destination,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === google.maps.DirectionsStatus.OK && result) {
            log('Route Found', result.routes[0].overview_path.length + ' points');
            
            // Generate Fare if starting trip (AND if not already persisted)
            if (rideStatus === 'in-progress') {
              const currentSummary = useRideStore.getState().tripSummary;
              
              if (!currentSummary) {
                const leg = result.routes[0].legs[0];
                const distMiles = (leg.distance?.value || 0) / 1609.34;
                const durMins = (leg.duration?.value || 0) / 60;
                setTripSummary({
                  distance: distMiles,
                  duration: durMins,
                  fare: 2.50 + (distMiles * 1.50) + (durMins * 0.20)
                });
              }
            }

            // Reset Animation
            progressRef.current = { segmentIndex: 0, segmentProgress: 0, lastFrameTime: 0 };
            isPausedRef.current = false;
            setActivePath(result.routes[0].overview_path);
            setIsPathLoaded(true);
          } else {
            console.error('[SIM] Route Error:', status);
          }
        }
      );
    };

    fetchRoute();
  }, [rideStatus, pickupLocation, dropoffLocation, setTripSummary, isGoogleMapsLoaded]); // FIX: Added dependency

  // 4. ANIMATION LOOP
  useEffect(() => {
    if (!isPathLoaded || activePath.length === 0) return;

    const animate = (time: number) => {
      if (isPausedRef.current) {
        animationFrameId.current = requestAnimationFrame(animate);
        return;
      }

      const state = progressRef.current;
      if (!state.lastFrameTime) state.lastFrameTime = time;
      const deltaTime = time - state.lastFrameTime;
      state.lastFrameTime = time;

      const startNode = activePath[state.segmentIndex];
      const endNode = activePath[state.segmentIndex + 1];

      if (!startNode || !endNode) return;

      const segmentDist = google.maps.geometry.spherical.computeDistanceBetween(startNode, endNode);
      const speedMs = (MOCK_SPEED_KMH * 1000) / 3600000;
      const stepDist = speedMs * deltaTime;
      const progressDelta = segmentDist > 0 ? stepDist / segmentDist : 1;

      state.segmentProgress += progressDelta;

      if (state.segmentProgress >= 1) {
        state.segmentProgress = 0;
        state.segmentIndex++;

        if (state.segmentIndex >= activePath.length - 1) {
          if (rideStatus === 'confirmed') {
            log('Arrived at Pickup');
            setRideStatus('arrived');
          } else if (rideStatus === 'in-progress') {
            log('Arrived at Destination');
            setRideStatus('finished');
          }
          return;
        }
      }

      // Interpolate
      const currentStart = activePath[state.segmentIndex];
      const currentEnd = activePath[state.segmentIndex + 1];
      const lat = currentStart.lat() + (currentEnd.lat() - currentStart.lat()) * state.segmentProgress;
      const lng = currentStart.lng() + (currentEnd.lng() - currentStart.lng()) * state.segmentProgress;

      setDriverLocation({ lat, lng });
      animationFrameId.current = requestAnimationFrame(animate);
    };

    animationFrameId.current = requestAnimationFrame(animate);
    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [isPathLoaded, activePath, rideStatus, setDriverLocation, setRideStatus]);

  return null;
}