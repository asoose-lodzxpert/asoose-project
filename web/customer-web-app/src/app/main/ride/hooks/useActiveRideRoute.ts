"use client";

import { useEffect, useRef } from "react";
import { useRideStore } from "../store/ride";

/**
 * useActiveRideRoute
 * ------------------
 * Keeps the on-map route polyline in sync with the live driver position
 * for active ride stages:
 *
 *   confirmed / arrived  → driver location → pickup   (driver heading to customer)
 *   in-progress          → driver location → dropoff  (heading to destination)
 *
 * The polyline is throttled (max one Directions API call per 30 s) to stay
 * within Google Maps quota while still reflecting meaningful route updates as
 * the driver moves.
 * During idle / searching / finished the polyline is left unchanged (cleared
 * by clearAllLocations / resetRide on those transitions).
 */
export function useActiveRideRoute() {
  const rideStatus = useRideStore((s) => s.rideStatus);
  const driverLocation = useRideStore((s) => s.driverLocation);
  const pickupLocation = useRideStore((s) => s.pickupLocation);
  const dropoffLocation = useRideStore((s) => s.dropoffLocation);
  const isGoogleMapsLoaded = useRideStore((s) => s.isGoogleMapsLoaded);
  const setRoutePolyline = useRideStore((s) => s.setRoutePolyline);

  // Epoch of the last successful Directions API call
  const lastFetchRef = useRef<number>(0);
  // Track the last driver position we fetched a route for (to detect meaningful movement)
  const lastDriverRef = useRef<{ lat: number; lng: number } | null>(null);

  useEffect(() => {
    if (!isGoogleMapsLoaded) return;
    if (typeof google === "undefined" || !google.maps?.DirectionsService)
      return;

    // Determine origin + destination based on ride stage
    let origin: google.maps.LatLngLiteral | null = null;
    let destination: google.maps.LatLngLiteral | null = null;

    if (rideStatus === "confirmed" || rideStatus === "arrived") {
      // Driver heading to pickup
      origin = driverLocation;
      destination = pickupLocation;
    } else if (rideStatus === "in-progress") {
      // Driver heading to dropoff
      origin = driverLocation;
      destination = dropoffLocation;
    } else {
      // Not an active navigation stage — nothing to do
      return;
    }

    if (!origin || !destination) return;

    const now = Date.now();
    const THROTTLE_MS = 30_000; // 30 seconds between API calls

    // Check whether the driver has moved significantly (> ~50 m) since the last fetch
    const SIGNIFICANT_MOVE_DEG = 0.0005; // ~55 m at the equator
    const lastDriver = lastDriverRef.current;
    const movedSignificantly =
      !lastDriver ||
      Math.abs(origin.lat - lastDriver.lat) > SIGNIFICANT_MOVE_DEG ||
      Math.abs(origin.lng - lastDriver.lng) > SIGNIFICANT_MOVE_DEG;

    if (!movedSignificantly && now - lastFetchRef.current < THROTTLE_MS) return;

    lastFetchRef.current = now;
    lastDriverRef.current = { lat: origin.lat, lng: origin.lng };

    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (
          status === google.maps.DirectionsStatus.OK &&
          result?.routes[0]?.overview_polyline
        ) {
          setRoutePolyline(result.routes[0].overview_polyline);
        }
        // On error, keep existing polyline — don't blank it out
      },
    );
  }, [
    rideStatus,
    driverLocation,
    pickupLocation,
    dropoffLocation,
    isGoogleMapsLoaded,
    setRoutePolyline,
  ]);
}
