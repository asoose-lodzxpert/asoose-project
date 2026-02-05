"use client";

import React from "react";
import Map from "./map";

// ✅ FIX: Change [number, number] to { lat: number; lng: number }
interface MapViewProps {
  isLoaded: boolean;
  userPos: { lat: number; lng: number } | null;
  destPos: { lat: number; lng: number } | null;
  tripStatus?: string;
  onRouteData?: (distance: number, duration: number) => void;
  // Add any other props that 'Map' accepts if needed
  driverPos?: { lat: number; lng: number };
  rideStage?: string;
}

export default function MapView(props: MapViewProps) {
  // Now the types match what <Map /> expects
  return <Map {...props} />;
}
