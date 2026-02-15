"use client";

import React, { useEffect, useRef, useState, useCallback, forwardRef, useImperativeHandle } from "react";
import { Crosshair, Loader2, AlertCircle } from "lucide-react";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

export interface MapLocation {
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface TrackingMapHandle {
  updateDriverCoordinates: (lat: number, lng: number, heading?: number) => void;
}

export interface TrackingMapProps {
  userLocation: MapLocation;
  driverLocation?: MapLocation; 
  pickupLocation?: MapLocation;
  destinationLocation?: MapLocation;
  showRoute?: boolean;
  height?: string;
  zoom?: number;
  autoCenterOnDriver?: boolean;
  rideStage?: string;
}

const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID;
const USE_ADVANCED_MARKERS = !!MAP_ID;

export const TrackingMap = forwardRef<TrackingMapHandle, TrackingMapProps>(({
  userLocation,
  driverLocation,
  pickupLocation,
  destinationLocation,
  showRoute = true,
  height = "400px",
  zoom = 15,
  autoCenterOnDriver = true,
  rideStage,
}, ref) => {
  const { isLoaded } = useGoogleMaps();

  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  const userMarkerRef = useRef<any>(null);
  const driverMarkerRef = useRef<any>(null);
  const pickupMarkerRef = useRef<any>(null);
  const destinationMarkerRef = useRef<any>(null);

  const [routePolyline, setRoutePolyline] = useState<google.maps.Polyline | null>(null);
  const [directionsService, setDirectionsService] = useState<google.maps.DirectionsService | null>(null);
  const driverContentRef = useRef<HTMLDivElement | null>(null);
  const animationRef = useRef<number | null>(null);
  
  const lastDriverPosRef = useRef<MapLocation | null>(null);
  const lastUpdateTimestampRef = useRef<number>(typeof performance !== 'undefined' ? performance.now() : 0);
  const hasCalculatedRouteRef = useRef(false);
  const hasAutoCenteredRef = useRef<Record<string, boolean>>({});
  const mapManuallyMovedRef = useRef(false);
  const [showRecenterButton, setShowRecenterButton] = useState(false);

  const updateMarkerPosition = useCallback((marker: any, position: { lat: number; lng: number }) => {
    if (marker instanceof window.google.maps.Marker) marker.setPosition(position);
    else marker.position = position;
  }, []);

  const removeMarker = useCallback((marker: any) => {
    if (!marker) return;
    if (marker instanceof window.google.maps.Marker) marker.setMap(null);
    else marker.map = null;
  }, []);

  const createMarker = useCallback(async (position: MapLocation, type: "user" | "driver" | "pickup" | "destination", existingMarker?: any) => {
    if (!map || !window.google) return null;
    if (!position || typeof position.latitude !== 'number' || typeof position.longitude !== 'number') return null;
    
    const pos = { lat: position.latitude, lng: position.longitude };

    if (existingMarker) {
      updateMarkerPosition(existingMarker, pos);
      return existingMarker;
    }

    if (USE_ADVANCED_MARKERS) {
      try {
        const { AdvancedMarkerElement, PinElement } = await window.google.maps.importLibrary("marker") as google.maps.MarkerLibrary;
        let content;

        if (type === "driver") {
          const iconDiv = document.createElement("div");
          iconDiv.style.width = "30px";
          iconDiv.style.height = "30px";
          iconDiv.style.display = "flex";
          iconDiv.style.alignItems = "center";
          iconDiv.style.justifyContent = "center";
          iconDiv.style.transition = "transform 0.1s linear"; 
          iconDiv.innerHTML = `<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M12 2L4.5 20.29C4.21 21 4.96 21.72 5.63 21.39L12 18.25L18.37 21.39C19.04 21.72 19.79 21 19.5 20.29L12 2Z" fill="#34A853" stroke="white" stroke-width="2"/></svg>`;
          driverContentRef.current = iconDiv;
          content = iconDiv;
        } else {
          const colors = {
            user: { background: "#4285F4", borderColor: "#FFFFFF", glyphColor: "white" },
            pickup: { background: "#EA4335", borderColor: "#B31412", glyphColor: "white" },
            destination: { background: "#FBBC04", borderColor: "#EA8600", glyphColor: "white" },
          };
          content = new PinElement({ scale: 1.2, ...colors[type] }).element;
        }

        return new AdvancedMarkerElement({ map, position: pos, title: type, content });
      } catch (e) {
        console.warn("Advanced Markers unavailable. Falling back.");
      }
    }

    const markerIcons = {
      user: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: "#4285F4", fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 3, scale: 10 },
      pickup: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: "#EA4335", fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 3, scale: 10 },
      destination: { path: window.google.maps.SymbolPath.CIRCLE, fillColor: "#FBBC04", fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 3, scale: 10 },
      driver: { path: "M12 2L4.5 20.29L12 17L19.5 20.29L12 2Z", fillColor: "#34A853", fillOpacity: 1, strokeColor: "#FFFFFF", strokeWeight: 2, scale: 1.5, anchor: new window.google.maps.Point(12, 12), rotation: position.heading || 0 },
    };

    return new window.google.maps.Marker({ position: pos, map, icon: markerIcons[type], title: type });
  }, [map, updateMarkerPosition]);

  useEffect(() => {
    if (!isLoaded || !window.google || !mapRef.current || map) return;

    // Guard: Prevent crash if userLocation is somehow missing (defensive)
    if (!userLocation) return; 

    try {
      const mapOptions: google.maps.MapOptions = {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
        styles: [
          { featureType: "poi.business", stylers: [{ visibility: "off" }] },
          { featureType: "transit", stylers: [{ visibility: "simplified" }] },
        ],
        ...(MAP_ID ? { mapId: MAP_ID } : {})
      };

      const newMap = new window.google.maps.Map(mapRef.current, mapOptions);
      setMap(newMap);
      setDirectionsService(new window.google.maps.DirectionsService());
      setIsInitialized(true);
      setInitError(null);

      newMap.addListener("dragstart", () => {
        mapManuallyMovedRef.current = true;
        setShowRecenterButton(true);
      });
      newMap.addListener("zoom_changed", () => {
        if (!mapManuallyMovedRef.current) {
            mapManuallyMovedRef.current = true;
            setShowRecenterButton(true);
        }
      });
    } catch (error) {
      setInitError("Failed to initialize map instance.");
    }
  }, [isLoaded, map, userLocation, zoom]);

  const updateDriverCoordinates = useCallback((lat: number, lng: number, heading?: number) => {
    if (!map || !isInitialized) return;

    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTimestampRef.current;
    const duration = Math.min(Math.max(timeSinceLastUpdate, 1000), 6000); 
    lastUpdateTimestampRef.current = now;

    const endPos = { latitude: lat, lng, heading };

    if (!driverMarkerRef.current) {
      createMarker({ latitude: lat, longitude: lng, heading }, "driver").then(m => {
        driverMarkerRef.current = m;
        lastDriverPosRef.current = { latitude: lat, longitude: lng, heading };
      });
      return;
    }

    const startPos = lastDriverPosRef.current || { latitude: lat, longitude: lng, heading };
    const startTime = performance.now();

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); 

      const currentLat = startPos.latitude + (endPos.latitude - startPos.latitude) * easeProgress;
      const currentLng = startPos.longitude + (endPos.lng - startPos.longitude) * easeProgress;

      updateMarkerPosition(driverMarkerRef.current, { lat: currentLat, lng: currentLng });

      if (driverContentRef.current && endPos.heading !== undefined) {
        driverContentRef.current.style.transform = `rotate(${endPos.heading}deg)`;
      }

      lastDriverPosRef.current = { latitude: currentLat, longitude: currentLng, heading: endPos.heading };

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    animationRef.current = requestAnimationFrame(animate);
  }, [map, isInitialized, createMarker, updateMarkerPosition]);

  useImperativeHandle(ref, () => ({ updateDriverCoordinates }));

  useEffect(() => {
    if (!map || !isInitialized) return;
    createMarker(userLocation, "user", userMarkerRef.current).then(m => { if(m) userMarkerRef.current = m; });
    if (pickupLocation) createMarker(pickupLocation, "pickup", pickupMarkerRef.current).then(m => { if(m) pickupMarkerRef.current = m; });
    if (destinationLocation) createMarker(destinationLocation, "destination", destinationMarkerRef.current).then(m => { if(m) destinationMarkerRef.current = m; });
    
    // FIX: Removed the (!lastDriverPosRef.current) check.
    // Now updates whenever driverLocation exists and changes.
    if (driverLocation) {
       updateDriverCoordinates(driverLocation.latitude, driverLocation.longitude, driverLocation.heading);
    }
  }, [map, isInitialized, userLocation, pickupLocation, destinationLocation, driverLocation, createMarker, updateDriverCoordinates]);

  useEffect(() => {
    if (!map || !directionsService || !showRoute || !isInitialized) return;

    const destination = rideStage === "ON_WAY" ? pickupLocation : destinationLocation;
    const origin = rideStage === "ON_WAY" ? (lastDriverPosRef.current || driverLocation) : (pickupLocation || userLocation);

    if (!destination || !origin || hasCalculatedRouteRef.current) return;

    directionsService.route({
      origin: { lat: origin.latitude, lng: origin.longitude },
      destination: { lat: destination.latitude, lng: destination.longitude },
      travelMode: google.maps.TravelMode.DRIVING,
    }, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        if (routePolyline) routePolyline.setMap(null);
        setRoutePolyline(new google.maps.Polyline({
          path: result.routes[0].overview_path,
          geodesic: true, strokeColor: "#4285F4", strokeOpacity: 0.8, strokeWeight: 4, map,
        }));
        hasCalculatedRouteRef.current = true;
      }
    });

    return () => { if (rideStage === "IDLE" || rideStage === "COMPLETED") hasCalculatedRouteRef.current = false; };
  }, [map, directionsService, showRoute, pickupLocation, destinationLocation, rideStage, userLocation, isInitialized, routePolyline, driverLocation]);

  useEffect(() => {
    if (!map || !isInitialized || mapManuallyMovedRef.current) return;
    const currentStage = rideStage || "UNKNOWN";
    if (hasAutoCenteredRef.current[currentStage]) return;

    const bounds = new google.maps.LatLngBounds();
    bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });

    const driverActive = lastDriverPosRef.current || driverLocation;
    if (driverActive && (currentStage === "ON_WAY" || currentStage === "ARRIVED" || autoCenterOnDriver)) {
      bounds.extend({ lat: driverActive.latitude, lng: driverActive.longitude });
    }
    if (pickupLocation) bounds.extend({ lat: pickupLocation.latitude, lng: pickupLocation.longitude });
    if (destinationLocation) bounds.extend({ lat: destinationLocation.latitude, lng: destinationLocation.longitude });

    map.fitBounds(bounds, { top: 80, right: 50, bottom: currentStage === "IDLE" ? 500 : 400, left: 50 });
    hasAutoCenteredRef.current[currentStage] = true;

    if (currentStage === "IDLE") hasAutoCenteredRef.current = { IDLE: true };
  }, [map, rideStage, userLocation, pickupLocation, destinationLocation, autoCenterOnDriver, isInitialized, driverLocation]);

  const handleRecenter = useCallback(() => {
    if (!map) return;
    mapManuallyMovedRef.current = false;
    setShowRecenterButton(false);
    hasAutoCenteredRef.current = {};

    const bounds = new google.maps.LatLngBounds();
    const activeDriver = lastDriverPosRef.current || driverLocation;

    if (activeDriver) bounds.extend({ lat: activeDriver.latitude, lng: activeDriver.longitude });
    if (rideStage === "ON_WAY" || rideStage === "ARRIVED") {
      if (pickupLocation) bounds.extend({ lat: pickupLocation.latitude, lng: pickupLocation.longitude });
    } else if (rideStage === "IN_PROGRESS") {
      if (destinationLocation) bounds.extend({ lat: destinationLocation.latitude, lng: destinationLocation.longitude });
    } else {
      bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });
      if (destinationLocation) bounds.extend({ lat: destinationLocation.latitude, lng: destinationLocation.longitude });
    }

    map.fitBounds(bounds, { top: 80, right: 50, bottom: rideStage === "IDLE" ? 500 : 400, left: 50 });
    if (rideStage) hasAutoCenteredRef.current[rideStage] = true;
  }, [map, driverLocation, pickupLocation, destinationLocation, userLocation, rideStage]);

  useEffect(() => {
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (routePolyline) routePolyline.setMap(null);
      removeMarker(userMarkerRef.current);
      removeMarker(driverMarkerRef.current);
      removeMarker(pickupMarkerRef.current);
      removeMarker(destinationMarkerRef.current);
      if (map && window.google) {
        window.google.maps.event.clearInstanceListeners(map);
      }
    };
  }, [map, routePolyline, removeMarker]);

  if (!isInitialized && !initError) return <div className="flex items-center justify-center bg-gray-100" style={{ height }}><Loader2 className="animate-spin text-emerald-500" /></div>;
  if (initError) return <div className="flex items-center justify-center bg-red-50" style={{ height }}><AlertCircle className="text-red-500" /></div>;

  return (
    <div style={{ position: "relative", width: "100%", height }}>
      <div ref={mapRef} style={{ width: "100%", height, borderRadius: "8px" }} className="shadow-md" />
      {showRecenterButton && (lastDriverPosRef.current || driverLocation) && (
        <button onClick={handleRecenter} className="absolute bottom-20 right-4 bg-white p-3 rounded-full shadow-lg z-10">
          <Crosshair size={20} className="text-emerald-600" />
        </button>
      )}
    </div>
  );
});

TrackingMap.displayName = "TrackingMap";