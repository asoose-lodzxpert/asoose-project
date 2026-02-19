'use client';

import { useEffect, useRef } from 'react';
import { useRideStore } from '../store/ride';

const MIN_ZOOM = 16;
const MAX_ZOOM = 18;
const FOLLOW_TILT = 45;
const FOLLOW_BEARING_OFFSET = 0; 
const INTERPOLATION_FACTOR = 0.05; // Lower = smoother/slower, Higher = snappier

export const useUberStyleDriverFollow = (map: google.maps.Map | null) => {
  const driverLocation = useRideStore((state) => state.driverLocation);
  const driverHeading = useRideStore((state) => state.driverHeading);
  const rideStatus = useRideStore((state) => state.rideStatus);
  
  // ✅ FIX: Use the correct property name 'isFollowingDriver'
  const isFollowing = useRideStore((state) => state.isFollowingDriver); 
  
  // Use refs to store the loop ID so we can cancel it
  const animationFrameId = useRef<number | null>(null);

  useEffect(() => {
    // Only follow in specific states
    const shouldFollow = ['in-progress', 'arrived', 'confirmed'].includes(rideStatus) && 
                         driverLocation && 
                         map && 
                         isFollowing; // Check if user has enabled following

    if (!shouldFollow) {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
      return;
    }

    const animate = () => {
      if (!map || !driverLocation) return;

      // 1. Get Current State
      const currentCenter = map.getCenter();
      const currentZoom = map.getZoom() || MIN_ZOOM;
      const currentTilt = map.getTilt() || 0;
      const currentHeading = map.getHeading() || 0;

      if (!currentCenter) return;

      // 2. Calculate Targets
      // Target Zoom: Zoom in closer as we get closer to the car (or just keep high zoom)
      const targetZoom = MAX_ZOOM; 
      
      // Target Heading: smooth rotation to match driver
      let targetHeading = driverHeading || 0; 
      
      // Fix rotation wrapping (shortest path)
      const diff = (targetHeading - currentHeading + 540) % 360 - 180;
      const nextHeading = currentHeading + diff * INTERPOLATION_FACTOR;

      // 3. Apply Smooth Updates (Linear Interpolation / Lerp)
      map.moveCamera({
        center: {
          lat: currentCenter.lat() + (driverLocation.lat - currentCenter.lat()) * INTERPOLATION_FACTOR,
          lng: currentCenter.lng() + (driverLocation.lng - currentCenter.lng()) * INTERPOLATION_FACTOR,
        },
        zoom: currentZoom + (targetZoom - currentZoom) * (INTERPOLATION_FACTOR * 0.5),
        tilt: currentTilt + (FOLLOW_TILT - currentTilt) * (INTERPOLATION_FACTOR * 0.5),
        heading: nextHeading,
      });

      // 4. Loop
      animationFrameId.current = requestAnimationFrame(animate);
    };

    // Start Loop
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameId.current) cancelAnimationFrame(animationFrameId.current);
    };
  }, [map, driverLocation, rideStatus, driverHeading, isFollowing]); // Added isFollowing to deps
};