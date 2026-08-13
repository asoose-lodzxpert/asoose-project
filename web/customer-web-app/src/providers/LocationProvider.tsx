"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRideStore } from "@/app/main/ride/store/ride";
import { ApiService } from "@/services/api.service";
import { CityFallbackDialog } from "@/components/CityFallbackDialog";
import type { ActiveCity } from "@/services/location.service";
import { useCityStore } from "@/store/useCityStore";

/**
 * LocationProvider automatically attempts to detect the user's GPS coordinates
 * on mount and synchronizes them with the global Store.
 * 
 * This ensures that marketplace queries and map views always have a 
 * "current location" to bias search results and filter stores.
 */
export function LocationProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const setUserLocation = useRideStore((state) => state.setUserLocation);
  const setGeolocationError = useRideStore((state) => state.setGeolocationError);
  const cityId = useRideStore((state) => state.cityId);
  const setCityId = useRideStore((state) => state.setCityId);
  const selectedCity = useCityStore((state) => state.selectedCity);
  const setSelectedCity = useCityStore((state) => state.setSelectedCity);
  const [hasRequested, setHasRequested] = useState(false);
  const [needsCityChoice, setNeedsCityChoice] = useState(false);

  const requestCityChoice = useCallback(() => {
    const currentCityId = useRideStore.getState().cityId;
    const currentCity = useCityStore.getState().selectedCity;
    if (!currentCityId && !currentCity) setNeedsCityChoice(true);
  }, []);

  // The two stores are persisted separately. Restore the ride/store location
  // from the user's saved city as soon as Zustand finishes hydrating it.
  useEffect(() => {
    if (!selectedCity) return;

    if (!cityId) setCityId(selectedCity.id);
    if (
      selectedCity.latitude != null &&
      selectedCity.longitude != null &&
      !useRideStore.getState().userLocation
    ) {
      setUserLocation({
        lat: selectedCity.latitude,
        lng: selectedCity.longitude,
      });
    }
    setNeedsCityChoice(false);
  }, [cityId, selectedCity, setCityId, setUserLocation]);

  useEffect(() => {
    if (typeof window === "undefined" || hasRequested) return;
    
    setHasRequested(true);

    if (!("geolocation" in navigator)) {
      setGeolocationError(null);
      requestCityChoice();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const coords = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        };

        if (
          !Number.isFinite(coords.lat) ||
          !Number.isFinite(coords.lng) ||
          Math.abs(coords.lat) > 90 ||
          Math.abs(coords.lng) > 180
        ) {
          setGeolocationError(null);
          requestCityChoice();
          return;
        }

        setUserLocation(coords);

        // Resolve cityId from coordinates
        try {
          const result: any = await ApiService.post("/locations/resolve-city", {
            latitude: coords.lat,
            longitude: coords.lng,
          });
          if (result?.city?.id) {
            setCityId(result.city.id);
            setNeedsCityChoice(false);
            console.log("🏙️ City detected:", result.city.name);
          } else {
            requestCityChoice();
          }
        } catch (cityErr) {
          console.error("Failed to resolve city from coordinates:", cityErr);
          requestCityChoice();
        }

        setGeolocationError(null);
        console.log("📍 Location detected:", coords);
      },
      (error) => {
        console.warn("⚠️ Geolocation error:", error.message);
        // Browser location is optional. Users can still search or choose both
        // points on the map, so do not turn this into a form validation error.
        setGeolocationError(null);
        requestCityChoice();
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 60000 }
    );
  }, [
    setUserLocation,
    setGeolocationError,
    setCityId,
    hasRequested,
    requestCityChoice,
  ]);

  const selectCity = async (city: ActiveCity) => {
    let latitude = city.latitude;
    let longitude = city.longitude;

    if ((latitude == null || longitude == null) && window.google?.maps) {
      try {
        const response = await new google.maps.Geocoder().geocode({
          address: `${city.name}, ${city.state}, ${city.country || "Nigeria"}`,
        });
        const point = response.results[0]?.geometry.location;
        if (point) {
          latitude = point.lat();
          longitude = point.lng();
        }
      } catch {
        // The city ID is sufficient for city-filtered services.
      }
    }

    const resolvedCity = { ...city, latitude, longitude };
    setSelectedCity(resolvedCity);
    setCityId(city.id);
    if (latitude != null && longitude != null) {
      setUserLocation({ lat: latitude, lng: longitude });
    }
    setNeedsCityChoice(false);
  };

  return (
    <>
      {children}
      <CityFallbackDialog
        open={
          needsCityChoice &&
          pathname.startsWith("/main") &&
          !cityId &&
          !selectedCity
        }
        onClose={() => setNeedsCityChoice(false)}
        onSelect={selectCity}
      />
    </>
  );
}
