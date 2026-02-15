"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useJsApiLoader, Libraries } from "@react-google-maps/api";

const LIBRARIES: Libraries = ["places"];

// FIX: Add loadError to the context definition
interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError?: Error;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
});

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  // FIX: Destructure loadError from the hook
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: LIBRARIES,
  });

  const value = useMemo(() => ({ isLoaded, loadError }), [isLoaded, loadError]);

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => useContext(GoogleMapsContext);