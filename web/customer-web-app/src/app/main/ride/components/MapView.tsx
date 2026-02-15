"use client";

import { forwardRef } from "react";
import { TrackingMap, TrackingMapHandle } from "@/components/shared/TrackingMap";

interface MapViewProps {
  isLoaded: boolean;
  userPos: { lat: number; lng: number } | null;
  destPos: { lat: number; lng: number } | null;
  tripStatus?: string;
  onRouteData?: (distance: number, duration: number) => void;
  driverPos?: { lat: number; lng: number; heading?: number }; 
  rideStage?: string;
}

const isValidLatLng = (p?: { lat?: number; lng?: number } | null): p is { lat: number; lng: number } => {
  return p != null && Number.isFinite(p.lat) && Number.isFinite(p.lng);
};

const MapView = forwardRef<TrackingMapHandle, MapViewProps>((props, ref) => {
  if (!props.isLoaded) return null;

  const safeUserPos = isValidLatLng(props.userPos) ? props.userPos : null;
  const safeDestPos = isValidLatLng(props.destPos) ? props.destPos : null;
  const safeDriverPos = isValidLatLng(props.driverPos) ? props.driverPos : undefined;

  if (!safeUserPos) return null;

  const showRoute = props.rideStage === "IDLE" || props.rideStage === "IN_PROGRESS" || props.rideStage === "ON_WAY" || props.rideStage === "ARRIVED";
  const autoCenter = props.rideStage === "ON_WAY";

  return (
    <TrackingMap 
      ref={ref}
      userLocation={{ latitude: safeUserPos.lat, longitude: safeUserPos.lng }}
      pickupLocation={props.rideStage === "IDLE" ? undefined : { latitude: safeUserPos.lat, longitude: safeUserPos.lng }}
      destinationLocation={safeDestPos ? { latitude: safeDestPos.lat, longitude: safeDestPos.lng } : undefined}
      driverLocation={safeDriverPos ? { latitude: safeDriverPos.lat, longitude: safeDriverPos.lng, heading: safeDriverPos.heading } : undefined}
      showRoute={showRoute}
      autoCenterOnDriver={autoCenter}
      rideStage={props.rideStage}
      height="100%"
    />
  );
});

MapView.displayName = "MapView";

export default MapView;