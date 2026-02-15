'use client';

import { useEffect } from 'react';
import { useRideStore } from "../store/ride";
import { useUberStyleDriverFollow } from '../hooks/useUberStyleDriverFollow';
export function MapCameraManager() {
  const mapInstance = useRideStore((state) => state.mapInstance);
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const rideStatus = useRideStore((state) => state.rideStatus);

  // Hook for the Uber-style following behavior
  useUberStyleDriverFollow(mapInstance);

  // Effect for initial centering when ride is confirmed
  useEffect(() => {
    if (mapInstance && rideStatus === 'confirmed' && pickupLocation && dropoffLocation) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupLocation);
      bounds.extend(dropoffLocation);
      mapInstance.fitBounds(bounds, 100); // 100px padding
    }
  }, [mapInstance, rideStatus, pickupLocation, dropoffLocation]);

  return null; // This is a non-visual component
}
