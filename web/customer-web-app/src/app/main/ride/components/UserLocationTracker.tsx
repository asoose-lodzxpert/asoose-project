'use client';

import { useEffect } from 'react';
import { useRideStore } from '../store/ride';
export function UserLocationTracker() {
  const setUserLocation = useRideStore((state) => state.setUserLocation);
  const setGeolocationError = useRideStore((state) => state.setGeolocationError);

  useEffect(() => {
    if (!navigator. geolocation) {
      setGeolocationError(null);
      return;
    }

    const handleSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords;
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        Math.abs(latitude) > 90 ||
        Math.abs(longitude) > 180
      ) {
        setGeolocationError(null);
        return;
      }
      setUserLocation({ lat: latitude, lng: longitude });
      setGeolocationError(null);
    };

    const handleError = (error: GeolocationPositionError) => {
      console.warn('Browser location unavailable:', error.message);
      setGeolocationError(null);
    };

    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 0,
    };

    const watchId = navigator.geolocation.watchPosition(
      handleSuccess,
      handleError,
      options
    );

    return () => {
      navigator.geolocation.clearWatch(watchId);
    };
  }, [setUserLocation, setGeolocationError]);

  return null; // This is a non-visual component
}
