"use client";

import { createContext, useContext, ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// 1. Define libraries outside the component to guarantee referential stability (Prevents re-render loops)
// Note: 'places' library is NOT loaded here — autocomplete/geocoding go through the backend.
const LIBRARIES: "geometry"[] = ["geometry"];

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
});

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  // 2. The SINGLE global loader call
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY!,
    libraries: LIBRARIES,
    language: "en",
  });

  if (loadError) {
    console.error("Google Maps Load Error:", loadError);
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

// 3. Custom Hook for child components to consume
export const useGoogleMaps = () => useContext(GoogleMapsContext);
