'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { toast } from 'react-toastify';
import { useRideStore } from '../store/ride';
import { subscribeToRideEvents, unsubscribeFromRideEvents } from '@/services/socket.service';
import { RideService } from '@/services/ride.service';

export function RideSocketListener() {
  const { data: session } = useSession();
  
  const rideId = useRideStore((state) => state.rideId);
  const setDriver = useRideStore((state) => state.setDriver);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setDriverLocation = useRideStore((state) => state.setDriverLocation);
  const setDriverHeading = useRideStore((state) => state.setDriverHeading);
  const setTripSummary = useRideStore((state) => state.setTripSummary);

  useEffect(() => {
    if (!rideId) return;

    console.log(`📡 Initializing Socket Listener for Ride: ${rideId}`);

    subscribeToRideEvents({
      // 1. Driver Found — backend emits DRIVER_FOUND with real vehicle data
      onDriverFound: (data) => {
        try {
          // Guard: ignore events for a different ride
          if (data.metadata.rideId !== rideId) return;

          const { driver } = data.metadata;
          console.log('✅ Driver Found:', driver.name);

          setDriver({
            name: driver.name,
            photoUrl: '/profile.jpg',
            vehicle: {
              make: driver.vehicle?.brand || 'Vehicle',
              model: driver.vehicle?.model || 'Car',
              licensePlate: driver.vehicle?.plateNumber || '---',
            },
            rating: 5.0, // Backend doesn't send rating in this event
            phone: driver.phone,
          });
          setRideStatus('confirmed');
          toast.success(`Driver found! ${driver.name} is on the way.`);
        } catch (error) {
          console.error('Socket error (onDriverFound):', error);
          toast.error('Error processing driver assignment.');
        }
      },

      // 2. Real-time Driver Location Updates
      onDriverLocationUpdate: (data) => {
        try {
          if (data.metadata.rideId !== rideId) return;

          setDriverLocation({
            lat: data.metadata.lat,
            lng: data.metadata.lng,
          });
          if (data.metadata.heading) {
            setDriverHeading(data.metadata.heading);
          }
        } catch (error) {
          console.error('Socket error (onDriverLocationUpdate):', error);
        }
      },

      // 3. Driver Arrived at Pickup
      onDriverArrived: (data) => {
        try {
          if (data.metadata.rideId !== rideId) return;

          setRideStatus('arrived');
          toast.info('Driver has arrived at pickup point!');
        } catch (error) {
          console.error('Socket error (onDriverArrived):', error);
        }
      },

      // 4. Trip Started (OTP verified)
      onTripStarted: (data) => {
        try {
          if (data.rideId !== rideId) return;

          setRideStatus('in-progress');
          toast.info('Trip started.');
        } catch (error) {
          console.error('Socket error (onTripStarted):', error);
        }
      },

      // 5. Trip Completed
      onTripCompleted: (data) => {
        try {
          if (data.rideId !== rideId) return;

          setRideStatus('finished');
          toast.success('Trip completed!');

          // Fetch final trip summary for the rating screen
          if (session?.accessToken) {
            RideService.getCurrentRide(session.accessToken)
              .then((ride) => {
                if (ride) {
                  setTripSummary({
                    fare: ride.totalFare || ride.estimatedFare || 0,
                    distance: ride.distanceKm || 0,
                    duration: 0,
                  });
                }
              })
              .catch((err) => {
                console.error('Failed to fetch final trip summary:', err);
              });
          }
        } catch (error) {
          console.error('Socket error (onTripCompleted):', error);
        }
      },

      // 6. Ride Cancelled
      onRideCancelled: (data) => {
        try {
          if (data.rideId !== rideId) return;

          setRideStatus('idle');
          toast.error('Ride was cancelled.');
        } catch (error) {
          console.error('Socket error (onRideCancelled):', error);
        }
      },
    });

    // Cleanup on unmount or rideId change
    return () => {
      console.log(`🔌 Disconnecting Socket Listener for Ride: ${rideId}`);
      unsubscribeFromRideEvents();
    };
  }, [rideId, setDriver, setRideStatus, setDriverLocation, setDriverHeading, setTripSummary, session?.accessToken]);

  return null; 
}