"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useRideStore } from "@/app/main/ride/store/ride";
import { CityFallbackDialog } from "@/components/CityFallbackDialog";
import { requestGeolocation } from "@/services/geolocation.service";
import {
  LocationService,
  type ActiveCity,
} from "@/services/location.service";
import { reverseGeocode } from "@/services/reverse-geocode.service";
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
  const setLocationLabel = useCityStore((state) => state.setLocationLabel);
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

    const detectLocation = async () => {
      try {
        const position = await requestGeolocation();
        const coords = { lat: position.lat, lng: position.lng };

        if (
          !Number.isFinite(coords.lat) ||
          !Number.isFinite(coords.lng) ||
          Math.abs(coords.lat) > 90 ||
          Math.abs(coords.lng) > 180
        ) {
          requestCityChoice();
          return;
        }

        // These exact browser coordinates are the source of truth for nearby
        // catalog requests. City resolution only adds the operating-city ID.
        setUserLocation(coords);

        const [cityResult, addressResult] = await Promise.allSettled([
          LocationService.resolveCity(coords.lat, coords.lng),
          reverseGeocode(coords.lat, coords.lng),
        ]);

        const address =
          addressResult.status === "fulfilled"
            ? addressResult.value.address
            : null;
        if (address) setLocationLabel(address);

        if (
          cityResult.status === "fulfilled" &&
          cityResult.value.serviceAvailable &&
          cityResult.value.city?.id
        ) {
          const city = cityResult.value.city;
          setCityId(city.id);
          setSelectedCity({
            ...city,
            latitude: coords.lat,
            longitude: coords.lng,
          });
          if (!address) {
            setLocationLabel([city.name, city.state].filter(Boolean).join(", "));
          }
          setNeedsCityChoice(false);
        } else {
          // Never combine fresh coordinates with a stale persisted city ID.
          setCityId(null);
          setSelectedCity(null);
          requestCityChoice();
        }

        setGeolocationError(null);
      } catch (error: unknown) {
        console.warn(
          "⚠️ Geolocation error:",
          error instanceof Error ? error.message : "Position unavailable",
        );
        // Browser location is optional. Fall back to a supported city only
        // when permission or device positioning is unavailable.
        setGeolocationError(null);
        requestCityChoice();
      }
    };

    void detectLocation();
  }, [
    setUserLocation,
    setGeolocationError,
    setCityId,
    setSelectedCity,
    setLocationLabel,
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
    setLocationLabel([city.name, city.state].filter(Boolean).join(", "));
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
