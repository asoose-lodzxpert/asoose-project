"use client";

import { useEffect } from "react";
import { useRideStore } from "../store/ride";
import { useUberStyleDriverFollow } from "../hooks/useUberStyleDriverFollow";
import { useActiveRideRoute } from "../hooks/useActiveRideRoute";

export function MapCameraManager() {
  const mapInstance = useRideStore((state) => state.mapInstance);
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const rideStatus = useRideStore((state) => state.rideStatus);

  // 1. Activate the Uber-style smooth follow hook
  // This handles the frame-by-frame animation when the driver moves
  useUberStyleDriverFollow(mapInstance);

  // 2. Keep the route polyline in sync with the driver's live position
  useActiveRideRoute();

  // 2. Handle Initial "Fit Bounds"
  // When the ride is first confirmed (or reloaded), we want to see the whole route
  useEffect(() => {
    if (
      mapInstance &&
      (rideStatus === "confirmed" || rideStatus === "searching") &&
      pickupLocation &&
      dropoffLocation
    ) {
      const bounds = new google.maps.LatLngBounds();
      bounds.extend(pickupLocation);
      bounds.extend(dropoffLocation);

      // Add some padding so pins aren't on the very edge
      mapInstance.fitBounds(bounds, {
        top: 100,
        right: 50,
        bottom: 300, // Extra padding at bottom for the slide-up panel
        left: 50,
      });
    }
  }, [mapInstance, rideStatus, pickupLocation, dropoffLocation]);

  return null; // Logic-only component, renders nothing
}
