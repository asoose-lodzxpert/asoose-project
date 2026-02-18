'use client';

import { useEffect, useRef } from 'react';
import { useSession } from 'next-auth/react';
import { useRideStore, RideStage } from '../store/ride';
import { RideService, RideStatus } from '@/services/ride.service';
import { mapRideToViewModel } from '@/services/mappers/ride.mapper';
import { toast } from 'react-toastify';

export function useRideSynchronization() {
  const { data: session } = useSession();
  const hasSynced = useRef(false); // Prevent double-fetch in React 18 strict mode

  // Store Setters
  const setRideId = useRideStore((state) => state.setRideId);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);
  const setPickupAddress = useRideStore((state) => state.setPickupAddress);
  const setDropoffAddress = useRideStore((state) => state.setDropoffAddress);
  const setDriver = useRideStore((state) => state.setDriver);
  const setTripSummary = useRideStore((state) => state.setTripSummary);
  const setRideType = useRideStore((state) => state.setRideType);

  useEffect(() => {
    async function syncRideState() {
      if (!session?.accessToken || hasSynced.current) return;

      try {
        console.log("🔄 Syncing ride state with server...");
        hasSynced.current = true;
        
        const backendRide = await RideService.getCurrentRide(session.accessToken);

        if (!backendRide) {
          console.log("✅ No active ride found. App is Idle.");
          return;
        }

        // Transform backend ride to ViewModel (handles all mapping)
        const activeRide = mapRideToViewModel(backendRide);

        console.log("🚀 Restoring Active Ride:", activeRide.id, activeRide.status);

        // 1. Restore IDs and Locations
        setRideId(activeRide.id);
        
        // Pickup address is guaranteed by mapper
        setPickupAddress(activeRide.pickupAddress.addressText);
        if (activeRide.pickupAddress.lat !== null && activeRide.pickupAddress.lng !== null) {
          setPickupLocation({ 
            lat: activeRide.pickupAddress.lat, 
            lng: activeRide.pickupAddress.lng 
          });
        }

        // Dropoff address is guaranteed by mapper
        setDropoffAddress(activeRide.dropoffAddress.addressText);
        if (activeRide.dropoffAddress.lat !== null && activeRide.dropoffAddress.lng !== null) {
          setDropoffLocation({ 
            lat: activeRide.dropoffAddress.lat, 
            lng: activeRide.dropoffAddress.lng 
          });
        }

        // 2. Restore Driver (if assigned)
        if (activeRide.driver) {
          setDriver({
            name: activeRide.driver.name,
            photoUrl: activeRide.driver.image || '/profile.jpg',
            vehicle: {
              make: activeRide.driver.vehicleBrand || 'Vehicle',
              model: activeRide.driver.vehicleModel || 'Car',
              licensePlate: activeRide.driver.vehicleNumber || '---',
            },
            rating: activeRide.driver.rating || 5.0,
            phone: '', // Not available in ViewModel (was never used)
          });
        }

        // 3. Map Backend Status to Frontend View
        const statusMap: Record<RideStatus, RideStage> = {
          'PENDING': 'searching',
          'REQUESTED': 'searching',
          'ACCEPTED': 'confirmed',   // Driver is on the way
          'ARRIVED': 'arrived',      // Driver is here
          'IN_PROGRESS': 'in-progress',
          'COMPLETED': 'finished',
          'CANCELLED': 'idle',
        };

        const mappedStatus = statusMap[activeRide.status] || 'idle';
        setRideStatus(mappedStatus);

        // 4. Restore Financials (if finished)
        if (mappedStatus === 'finished') {
           setTripSummary({
             fare: activeRide.actualFare,
             distance: activeRide.distanceKm || 0,
             duration: activeRide.durationMin || 0
           });
        }

      } catch (error: any) {
        // Silent fail for "no active ride" - this is expected when idle
        const status = error?.status ?? error?.response?.status;
        const message = error?.message ?? error?.response?.data?.message ?? String(error);
        if (status === 404 || message?.includes('not found')) {
          console.log("✅ No active ride found. App is Idle.");
          return;
        }

        // Log actual errors
        console.warn("Failed to sync ride state:", message, error);

        // Don't toast on sync errors - just log
        // The app will continue working in idle state
      }
    }

    syncRideState();
  }, [session, setRideId, setRideStatus]);
}