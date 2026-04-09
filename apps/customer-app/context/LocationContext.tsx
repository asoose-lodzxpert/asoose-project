import React, { createContext, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { resolveAddress } from "@/lib/reverse-address";
import AsyncStorage from "@react-native-async-storage/async-storage";

const CITY_CACHE_KEY = "asoose_city_cache";
const API_URL = process.env.EXPO_PUBLIC_API_URL;

export type CityInfo = {
  id: string;
  name: string;
  state: string;
};

type LocationData = {
  coords: Location.LocationObjectCoords | null;
  label: string;
  address: string;
};

type LocationContextType = {
  location: LocationData | null;
  city: CityInfo | null;
  loading: boolean;
  resolving: boolean;
  openPicker: () => void;
  closePicker: () => void;
  useCurrentLocation: () => Promise<void>;
  setFromMap: (coords: Location.LocationObjectCoords) => Promise<void>;
  pickerVisible: boolean;
};

const LocationContext = createContext<LocationContextType | null>(null);

/**
 * Resolves GPS coordinates to an active City via the backend.
 * The result is cached in AsyncStorage so we don't hit the API on every launch.
 */
async function resolveCity(lat: number, lng: number): Promise<CityInfo | null> {
  try {
    const cacheRaw = await AsyncStorage.getItem(CITY_CACHE_KEY);
    if (cacheRaw) {
      const cached = JSON.parse(cacheRaw) as { city: CityInfo; lat: number; lng: number };
      // Use cache if within 0.05 degree (approx. 5km)
      const latDiff = Math.abs(cached.lat - lat);
      const lngDiff = Math.abs(cached.lng - lng);
      if (latDiff < 0.05 && lngDiff < 0.05 && cached.city) {
        return cached.city;
      }
    }

    const res = await fetch(`${API_URL}/maps/city-by-coords?lat=${lat}&lng=${lng}`);
    if (!res.ok) return null;
    const data = await res.json();
    if (data?.id) {
      await AsyncStorage.setItem(CITY_CACHE_KEY, JSON.stringify({ city: data, lat, lng }));
      return data as CityInfo;
    }
    return null;
  } catch {
    return null;
  }
}

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [city, setCity] = useState<CityInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);

  async function useCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    setResolving(true);
    try {
      const loc = await Location.getCurrentPositionAsync({});
      const [resolved, resolvedCity] = await Promise.all([
        resolveAddress(loc.coords),
        resolveCity(loc.coords.latitude, loc.coords.longitude),
      ]);
      setLocation({
        coords: loc.coords,
        label: resolved?.label ?? "Current location",
        address: resolved?.address ?? "Using GPS coordinates",
      });
      setCity(resolvedCity);
    } finally {
      setResolving(false);
    }
    setPickerVisible(false);
  }

  async function setFromMap(coords: Location.LocationObjectCoords) {
    setResolving(true);
    try {
      const [resolved, resolvedCity] = await Promise.all([
        resolveAddress(coords),
        resolveCity(coords.latitude, coords.longitude),
      ]);
      setLocation({
        coords: coords,
        label: resolved?.label ?? "Preferred location",
        address: resolved?.address ?? "Using GPS coordinates",
      });
      setCity(resolvedCity);
    } finally {
      setResolving(false);
    }
    setPickerVisible(false);
  }

  useEffect(() => {
    useCurrentLocation().finally(() => setLoading(false));
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        city,
        loading,
        resolving,
        pickerVisible,
        openPicker: () => setPickerVisible(true),
        closePicker: () => setPickerVisible(false),
        useCurrentLocation,
        setFromMap,
      }}
    >
      {children}
    </LocationContext.Provider>
  );
}

export function useLocation() {
  const ctx = useContext(LocationContext);
  if (!ctx) throw new Error("useLocation must be used within LocationProvider");
  return ctx;
}
