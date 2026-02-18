'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react'; // 1. Import Session
import { toast } from 'react-toastify';
import { useRideStore } from '../store/ride';
import { subscribeToRideEvents, unsubscribeFromRideEvents } from '@/services/socket.service';
import { RideService } from '@/services/ride.service'; // 2. Import Service

export function RideSocketListener() {
  const { data: session } = useSession(); // 3. Get Session
  
  const rideId = useRideStore((state) => state.rideId);
  const setDriver = useRideStore((state) => state.setDriver);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setDriverLocation = useRideStore((state) => state.setDriverLocation);
  const setDriverHeading = useRideStore((state) => state.setDriverHeading);
  const setTripSummary = useRideStore((state) => state.setTripSummary); // 4. Get Summary Setter

  useEffect(() => {
    if (!rideId) return;

    console.log(`📡 Initializing Socket Listener for Ride: ${rideId}`);

    subscribeToRideEvents(rideId, {
      // 1. Driver Found & Assigned
      onDriverAssigned: (data) => {
        try {
          console.log('✅ Driver Assigned:', data);
          setDriver({
            name: data.driver.name,
            photoUrl: data.driver.image || '/profile.jpg',
            vehicle: {
              make: 'Toyota', 
              model: 'Corolla',
              licensePlate: data.driver.vehicleNumber,
            },
            rating: data.driver.rating,
            phone: data.driver.phone
          });
          setDriverLocation({
            lat: data.driver.location.latitude,
            lng: data.driver.location.longitude
          });
          setRideStatus('confirmed');
          toast.success(`Driver found! ${data.driver.name} is on the way.`);
        } catch (error) {
          console.error('Socket error (onDriverAssigned):', error);
          toast.error('Error processing driver assignment.');
        }
      },
      // 2. Real-time Driver Movement
      onDriverLocationUpdate: (data) => {
        try {
          setDriverLocation({
            lat: data.location.latitude,
            lng: data.location.longitude
          });
          if (data.location.heading) {
            setDriverHeading(data.location.heading);
          }
        } catch (error) {
          console.error('Socket error (onDriverLocationUpdate):', error);
        }
      },
      // 3. Status Changes (Arrived, In Progress, Completed)
      onStatusChanged: (data) => {
        try {
          console.log('🔄 Ride Status Changed:', data.status);
          switch (data.status) {
            case 'ACCEPTED':
              setRideStatus('confirmed');
              break;
            case 'ARRIVED': 
              setRideStatus('arrived');
              toast.info('Driver has arrived!');
              break;
            case 'IN_PROGRESS':
              setRideStatus('in-progress');
              toast.info('Trip started.');
              break;
            case 'COMPLETED':
              setRideStatus('finished');
              toast.success('Trip completed!');
              if (session?.accessToken) {
                RideService.getCurrentRide(session.accessToken)
                  .then((ride) => {
                    if (ride) {
                      setTripSummary({
                        fare: ride.totalFare || ride.estimatedFare || 0,
                        distance: ride.distanceKm || 0,
                        duration: 0 // Duration calculation can be added here if start/end times exist
                      });
                    }
                  })
                  .catch((err) => {
                    console.error("Failed to fetch final trip summary:", err);
                    toast.error('Error fetching final trip summary.');
                  });
              }
              break;
            case 'CANCELLED':
              setRideStatus('idle');
              toast.error('Ride was cancelled.');
              break;
          }
        } catch (error) {
          console.error('Socket error (onStatusChanged):', error);
          toast.error('Error processing ride status update.');
        }
      },
      // 4. Specific Arrival Event (if backend emits this separately)
      onDriverArrived: () => {
        try {
          setRideStatus('arrived');
          toast.info('Driver has arrived at pickup point.');
        } catch (error) {
          console.error('Socket error (onDriverArrived):', error);
        }
      }
    });

    // Cleanup on unmount or rideId change
    return () => {
      console.log(`🔌 Disconnecting Socket Listener for Ride: ${rideId}`);
      unsubscribeFromRideEvents(rideId);
    };
  }, [rideId, setDriver, setRideStatus, setDriverLocation, setDriverHeading, setTripSummary, session?.accessToken]);

  return null; 
}