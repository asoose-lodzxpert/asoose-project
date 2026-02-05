import React, { createContext, useContext, useEffect, useState } from "react";
import * as Location from "expo-location";
import { resolveAddress } from "@/lib/reverse-address";

type LocationData = {
  coords: Location.LocationObjectCoords | null;
  label: string;
  address: string;
};

type LocationContextType = {
  location: LocationData | null;
  loading: boolean;
  openPicker: () => void;
  closePicker: () => void;
  useCurrentLocation: () => Promise<void>;
  setFromMap: (coords: Location.LocationObjectCoords) => Promise<void>;
  pickerVisible: boolean;
};

const LocationContext = createContext<LocationContextType | null>(null);

export function LocationProvider({ children }: { children: React.ReactNode }) {
  const [location, setLocation] = useState<LocationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [pickerVisible, setPickerVisible] = useState(false);

  async function useCurrentLocation() {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return;

    const loc = await Location.getCurrentPositionAsync({});
    const resolved = await resolveAddress(loc.coords);
    setLocation({
      coords: loc.coords,
      label: resolved?.label ?? "Current location",
      address: resolved?.address ?? "Using GPS coordinates",
    });
    setPickerVisible(false);
  }

  async function setFromMap(coords: Location.LocationObjectCoords) {
    const resolved = await resolveAddress(coords);
    setLocation({
      coords: coords,
      label: resolved?.label ?? "Preferred location",
      address: resolved?.address ?? "Using GPS coordinates",
    });
    setPickerVisible(false);
  }

  useEffect(() => {
    useCurrentLocation().finally(() => setLoading(false));
  }, []);

  return (
    <LocationContext.Provider
      value={{
        location,
        loading,
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
