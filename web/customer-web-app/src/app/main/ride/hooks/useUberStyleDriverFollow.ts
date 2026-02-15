import { useMemo, useCallback, useRef } from 'react';
import { useRideStore } from '../store/ride';

const MIN_ZOOM = 16;
const MAX_ZOOM = 18;
const ZOOM_IN_SPEED = 0.00005; // Adjust for faster/slower zoom in
const FOLLOW_TILT = 45;
const FOLLOW_BEARING_OFFSET = -45; // Driver icon is not pointing straight up

export const useUberStyleDriverFollow = (map: google.maps.Map | null) => {
  const driverLocation = useRideStore((state) => state.driverLocation);
  const rideStatus = useRideStore((state) => state.rideStatus);
  const lastBearing = useRef(0);

  const smoothedBearing = useMemo(() => {
    return (currentBearing: number, alpha: number = 0.1) => {
      lastBearing.current = alpha * currentBearing + (1 - alpha) * lastBearing.current;
      return lastBearing.current;
    };
  }, []);

  const calculateBearing = useCallback((lat1: number, lng1: number, lat2: number, lng2: number) => {
    const dLng = lng2 - lng1;
    const y = Math.sin(dLng) * Math.cos(lat2);
    const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
    return (Math.atan2(y, x) * 180) / Math.PI;
  }, []);

  const updateCamera = useCallback(() => {
    if (!map || !driverLocation || rideStatus !== 'in-progress') return;

    const currentCenter = map.getCenter();
    if (!currentCenter) return;

    const currentZoom = map.getZoom() || MIN_ZOOM;
    const currentBearing = map.getHeading() || 0;
    const currentTilt = map.getTilt() || 0;

    const distanceToDriver = google.maps.geometry.spherical.computeDistanceBetween(
      currentCenter,
      new google.maps.LatLng(driverLocation)
    );

    const newZoom = Math.min(MAX_ZOOM, MIN_ZOOM + (1 / (distanceToDriver * ZOOM_IN_SPEED + 1)) * (MAX_ZOOM - MIN_ZOOM));

    let newBearing = currentBearing;
    if (distanceToDriver > 5) {
      const bearing = calculateBearing(
        currentCenter.lat(),
        currentCenter.lng(),
        driverLocation.lat,
        driverLocation.lng
      );
      newBearing = smoothedBearing(bearing);
    }

    map.moveCamera({
      center: driverLocation,
      zoom: currentZoom + (newZoom - currentZoom) * 0.1, // Smooth zoom
      heading: currentBearing + (newBearing + FOLLOW_BEARING_OFFSET - currentBearing) * 0.1, // Smooth bearing
      tilt: currentTilt + (FOLLOW_TILT - currentTilt) * 0.1, // Smooth tilt
    });

  }, [map, driverLocation, rideStatus, calculateBearing, smoothedBearing]);

  return updateCamera;
};
