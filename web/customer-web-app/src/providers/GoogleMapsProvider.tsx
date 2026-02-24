"use client";

import { createContext, useContext, ReactNode } from "react";
import { useJsApiLoader } from "@react-google-maps/api";

// 1. Define libraries outside the component to guarantee referential stability.
// Note: 'places' is NOT loaded here — autocomplete/geocoding go through the backend
// via /maps/address-search and /maps/geocode so the API key is never browser-exposed
// for Places calls.
const LIBRARIES: ("geometry" | "routes")[] = ["geometry", "routes"];

// ---------------------------------------------------------------------------
// Dev-time key validation
// ---------------------------------------------------------------------------
const MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY ?? "";

if (process.env.NODE_ENV !== "production" && !MAPS_API_KEY) {
  console.error(
    "[GoogleMapsProvider] NEXT_PUBLIC_GOOGLE_MAPS_KEY is not set.\n" +
    "Maps will fail to load. Add the key to .env.local and restart the dev server.",
  );
}

interface GoogleMapsContextType {
  isLoaded: boolean;
  loadError: Error | undefined;
}

const GoogleMapsContext = createContext<GoogleMapsContextType>({
  isLoaded: false,
  loadError: undefined,
});

export function GoogleMapsProvider({ children }: { children: ReactNode }) {
  // 2. The SINGLE global loader — called once at the app root.
  const { isLoaded, loadError } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: MAPS_API_KEY,
    libraries: LIBRARIES,
    language: "en",
    // region biases geocoding results (optional but recommended for accuracy)
    region: "NG",
  });

  // 3. Surface load failures so child components don't crash on undefined `google`.
  if (loadError) {
    console.error("[GoogleMapsProvider] Load failed:", loadError.message);
  }

  return (
    <GoogleMapsContext.Provider value={{ isLoaded, loadError }}>
      {children}
    </GoogleMapsContext.Provider>
  );
}

// 4. Custom Hook — always check isLoaded before calling google.maps.*
export const useGoogleMaps = () => useContext(GoogleMapsContext);
