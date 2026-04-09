"use client";

import React, { createContext, useContext, useEffect, useState } from "react";
import { useRideStore } from "@/app/main/ride/store/ride";
import { toast } from "react-toastify";
import { ApiService } from "@/services/api.service";

/**
 * LocationProvider automatically attempts to detect the user's GPS coordinates
 * on mount and synchronizes them with the global Store.
 * 
 * This ensures that marketplace queries and map views always have a 
 * "current location" to bias search results and filter stores.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const setUserLocation = useRideStore((state) => state.setUserLocation);
  const setGeolocationError = useRideStore((state) => state.setGeolocationError);
  const [hasRequested, setHasRequested] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined" || hasRequested) return;
    
    setHasRequested(true);

    if (!("geolocation" in navigator)) {
      setGeolocationError("Geolocation not supported");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };
        setUserLocation(coords);

        // Resolve cityId from coordinates
        try {
          const cityData: any = await ApiService.get(
            `/maps/city-by-coords?lat=${coords.lat}&lng=${coords.lng}`,
          );
          if (cityData && cityData.id) {
            useRideStore.getState().setCityId(cityData.id);
            console.log("🏙️ City detected:", cityData.name);
          }
        } catch (cityErr) {
          console.error("Failed to resolve city from coordinates:", cityErr);
        }

        setGeolocationError(null);
        console.log("📍 Location detected:", coords);
      },
      (error) => {
        console.warn("⚠️ Geolocation error:", error.message);
        setGeolocationError(error.message);
        // We don't toast error here to avoid annoying users if they deny permission
        // Fallbacks are handled in the components themselves.
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [setUserLocation, setGeolocationError, hasRequested]);

  return <>{children}</>;
}
