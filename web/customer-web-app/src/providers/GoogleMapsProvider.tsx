"use client";

import { createContext, useContext, ReactNode, useMemo } from "react";
import { useJsApiLoader, Libraries } from "@react-google-maps/api";

const LIBRARIES: Libraries = ["places"];

const GoogleMapsContext = createContext<{ isLoaded: boolean }>({
  isLoaded: false,
});

export const GoogleMapsProvider = ({ children }: { children: ReactNode }) => {
  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",

    googleMapsApiKey: process.env.NEXT_PUBLIC_GOOGLE_MAPS_KEY || "",
    libraries: LIBRARIES,
  });

  const value = useMemo(() => ({ isLoaded }), [isLoaded]);

  return (
    <GoogleMapsContext.Provider value={value}>
      {children}
    </GoogleMapsContext.Provider>
  );
};

export const useGoogleMaps = () => useContext(GoogleMapsContext);
