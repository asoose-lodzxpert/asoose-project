"use client";

import { useCallback, useMemo, useEffect, useRef } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useRideStore } from "../store/ride";
import { CarMarker } from "./CarMarket";
import { useGoogleMaps } from "@/providers/GoogleMapsProvider";

const containerStyle = {
  width: "100%",
  height: "100%",
};

// ✅ UPDATED: Default Center to Maiduguri
const defaultCenter = {
  lat: 11.8345,
  lng: 13.1507,
};

const mapOptions = {
  disableDefaultUI: true,
  zoomControl: false,
  mapTypeControl: false,
  streetViewControl: false,
  fullscreenControl: false,
  styles: [
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ],
};

export function MapView() {
  const { isLoaded, loadError } = useGoogleMaps();
  const polylineRefRef = useRef<google.maps.Polyline | null>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);

  // Selectors from Zustand store
  const routePolyline = useRideStore((state) => state.routePolyline);
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const driverLocation = useRideStore((state) => state.driverLocation);
  const driverHeading = useRideStore((state) => state.driverHeading);
  const rideStatus = useRideStore((state) => state.rideStatus);
  const isConfiguring = useRideStore((state) => state.isConfiguring);
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);
  const setPickupAddress = useRideStore((state) => state.setPickupAddress);
  const setDropoffAddress = useRideStore((state) => state.setDropoffAddress);
  const setMapInstance = useRideStore((state) => state.setMapInstance);
  const setIsGoogleMapsLoaded = useRideStore(
    (state) => state.setIsGoogleMapsLoaded,
  );

  /**
   * Reverse-geocode a LatLng and return a human-readable label.
   * Falls back to "lat, lng" so the address field is never blank or "Pinned Location".
   */
  const reverseGeocode = useCallback(
    async (lat: number, lng: number): Promise<string> => {
      try {
        const geocoder = new google.maps.Geocoder();
        const result = await geocoder.geocode({ location: { lat, lng } });
        const best = result.results[0];
        if (best?.formatted_address) return best.formatted_address;
      } catch {
        // Geocoder unavailable — use coordinate fallback
      }
      return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
    },
    [],
  );

  // Safe Polyline Decoding
  const routePath = useMemo(() => {
    if (
      !isLoaded ||
      !window.google ||
      !window.google.maps ||
      !window.google.maps.geometry
    ) {
      return [];
    }
    return routePolyline
      ? window.google.maps.geometry.encoding.decodePath(routePolyline)
      : [];
  }, [isLoaded, routePolyline]);

  // Polyline lifecycle effect
  useEffect(() => {
    if (!routePath || !mapInstanceRef.current) {
      // Remove polyline if no route
      if (polylineRefRef.current) {
        polylineRefRef.current.setMap(null);
        polylineRefRef.current = null;
      }
      return;
    }
    // Create new polyline
    if (polylineRefRef.current) {
      polylineRefRef.current.setMap(null);
    }
    polylineRefRef.current = new google.maps.Polyline({
      path: routePath,
      map: mapInstanceRef.current,
      strokeColor: "#4A90E2",
      strokeOpacity: 0.8,
      strokeWeight: 6,
      geodesic: true,
    });
    // Cleanup on unmount
    return () => {
      if (polylineRefRef.current) {
        polylineRefRef.current.setMap(null);
        polylineRefRef.current = null;
      }
    };
  }, [routePath]);
  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      try {
        mapInstanceRef.current = map;
        setMapInstance(map);
        setIsGoogleMapsLoaded(true);
      } catch (error) {
        console.error("Error during map load:", error);
        setIsGoogleMapsLoaded(false);
      }
    },
    [setMapInstance, setIsGoogleMapsLoaded],
  );

  const onMapUnmount = useCallback(() => {
    try {
      setMapInstance(null);
      setIsGoogleMapsLoaded(false);
    } catch (error) {
      console.error("Error during map unmount:", error);
    }
  }, [setMapInstance, setIsGoogleMapsLoaded]);

  const handleMapClick = async (e: google.maps.MapMouseEvent) => {
    try {
      if (!e.latLng) return;
      if (rideStatus !== "idle" && rideStatus !== "configuring") return;
      const location = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      const label = await reverseGeocode(location.lat, location.lng);
      if (isConfiguring === "pickup") {
        setPickupLocation(location);
        setPickupAddress(label);
      } else if (isConfiguring === "dropoff") {
        setDropoffLocation(location);
        setDropoffAddress(label);
      }
    } catch (error) {
      console.error("Error during map click:", error);
    }
  };

  if (loadError) {
    return (
      <div className="flex items-center justify-center h-full bg-zinc-900 text-white">
        Error loading maps. Check API Key.
      </div>
    );
  }

  return isLoaded ? (
    <GoogleMap
      mapContainerStyle={containerStyle}
      center={defaultCenter}
      zoom={14} // Adjusted zoom slightly for city view
      options={mapOptions}
      onLoad={onMapLoad}
      onUnmount={onMapUnmount}
      onClick={handleMapClick}
    >
      {pickupLocation && (
        <Marker
          position={pickupLocation}
          label={{ text: "P", color: "white" }}
        />
      )}
      {dropoffLocation && (
        <Marker
          position={dropoffLocation}
          label={{ text: "D", color: "white" }}
        />
      )}

      {driverLocation && (
        <CarMarker position={driverLocation} heading={driverHeading} />
      )}
    </GoogleMap>
  ) : (
    <div className="flex items-center justify-center h-full bg-zinc-900 text-white">
      Loading Map...
    </div>
  );
}
