"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export interface MapLocation {
  latitude: number;
  longitude: number;
  heading?: number;
}

export interface TrackingMapProps {
  // Current user location
  userLocation: MapLocation;
  // Driver/Rider location
  driverLocation?: MapLocation;
  // Pickup location
  pickupLocation?: MapLocation;
  // Destination location
  destinationLocation?: MapLocation;
  // Show route from driver to user
  showRoute?: boolean;
  // Map height
  height?: string;
  // Zoom level (default: 15)
  zoom?: number;
  // Auto center on driver
  autoCenterOnDriver?: boolean;
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";

export const TrackingMap: React.FC<TrackingMapProps> = ({
  userLocation,
  driverLocation,
  pickupLocation,
  destinationLocation,
  showRoute = true,
  height = "400px",
  zoom = 15,
  autoCenterOnDriver = true,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const [map, setMap] = useState<google.maps.Map | null>(null);
  const [markers, setMarkers] = useState<{
    user?: google.maps.Marker;
    driver?: google.maps.Marker;
    pickup?: google.maps.Marker;
    destination?: google.maps.Marker;
  }>({});
  const [routePolyline, setRoutePolyline] =
    useState<google.maps.Polyline | null>(null);
  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "weekly",
    });

    const initMap = async () => {
      //   @ts-ignore - Loader v2.x doesn't have proper types
      await loader.load();

      const newMap = new google.maps.Map(mapRef.current!, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      setMap(newMap);
      setDirectionsService(new google.maps.DirectionsService());
    };

    initMap();
  }, [map, userLocation, zoom]);

  // Update user marker
  useEffect(() => {
    if (!map) return;

    if (markers.user) {
      markers.user.setPosition({
        lat: userLocation.latitude,
        lng: userLocation.longitude,
      });
    } else {
      const userMarker = new google.maps.Marker({
        position: { lat: userLocation.latitude, lng: userLocation.longitude },
        map,
        title: "Your Location",
        icon: {
          path: google.maps.SymbolPath.CIRCLE,
          scale: 8,
          fillColor: "#4285F4",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
        },
      });

      setMarkers((prev) => ({ ...prev, user: userMarker }));
    }
  }, [map, userLocation, markers.user]);

  // Update driver marker
  useEffect(() => {
    if (!map || !driverLocation) return;

    if (markers.driver) {
      markers.driver.setPosition({
        lat: driverLocation.latitude,
        lng: driverLocation.longitude,
      });

      // Update heading/rotation if provided
      if (driverLocation.heading !== undefined) {
        markers.driver.setIcon({
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#34A853",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          rotation: driverLocation.heading,
        });
      }
    } else {
      const driverMarker = new google.maps.Marker({
        position: {
          lat: driverLocation.latitude,
          lng: driverLocation.longitude,
        },
        map,
        title: "Driver",
        icon: {
          path: google.maps.SymbolPath.FORWARD_CLOSED_ARROW,
          scale: 5,
          fillColor: "#34A853",
          fillOpacity: 1,
          strokeColor: "#FFFFFF",
          strokeWeight: 2,
          rotation: driverLocation.heading || 0,
        },
      });

      setMarkers((prev) => ({ ...prev, driver: driverMarker }));
    }

    // Auto-center on driver if enabled
    if (autoCenterOnDriver) {
      map.panTo({
        lat: driverLocation.latitude,
        lng: driverLocation.longitude,
      });
    }
  }, [map, driverLocation, markers.driver, autoCenterOnDriver]);

  // Update pickup marker
  useEffect(() => {
    if (!map || !pickupLocation) {
      if (markers.pickup) {
        markers.pickup.setMap(null);
        setMarkers((prev) => ({ ...prev, pickup: undefined }));
      }
      return;
    }

    if (markers.pickup) {
      markers.pickup.setPosition({
        lat: pickupLocation.latitude,
        lng: pickupLocation.longitude,
      });
    } else {
      const pickupMarker = new google.maps.Marker({
        position: {
          lat: pickupLocation.latitude,
          lng: pickupLocation.longitude,
        },
        map,
        title: "Pickup Location",
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/green-dot.png",
        },
      });

      setMarkers((prev) => ({ ...prev, pickup: pickupMarker }));
    }
  }, [map, pickupLocation, markers.pickup]);

  // Update destination marker
  useEffect(() => {
    if (!map || !destinationLocation) {
      if (markers.destination) {
        markers.destination.setMap(null);
        setMarkers((prev) => ({ ...prev, destination: undefined }));
      }
      return;
    }

    if (markers.destination) {
      markers.destination.setPosition({
        lat: destinationLocation.latitude,
        lng: destinationLocation.longitude,
      });
    } else {
      const destinationMarker = new google.maps.Marker({
        position: {
          lat: destinationLocation.latitude,
          lng: destinationLocation.longitude,
        },
        map,
        title: "Destination",
        icon: {
          url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png",
        },
      });

      setMarkers((prev) => ({ ...prev, destination: destinationMarker }));
    }
  }, [map, destinationLocation, markers.destination]);

  // Draw route from driver to pickup/destination
  useEffect(() => {
    if (!map || !directionsService || !showRoute || !driverLocation) return;

    const destination = pickupLocation || destinationLocation;
    if (!destination) return;

    const request: google.maps.DirectionsRequest = {
      origin: { lat: driverLocation.latitude, lng: driverLocation.longitude },
      destination: { lat: destination.latitude, lng: destination.longitude },
      travelMode: google.maps.TravelMode.DRIVING,
    };

    directionsService.route(request, (result, status) => {
      if (status === google.maps.DirectionsStatus.OK && result) {
        // Clear old polyline
        if (routePolyline) {
          routePolyline.setMap(null);
        }

        // Draw new polyline
        const path = result.routes[0].overview_path;
        const newPolyline = new google.maps.Polyline({
          path,
          geodesic: true,
          strokeColor: "#4285F4",
          strokeOpacity: 0.8,
          strokeWeight: 4,
          map,
        });

        setRoutePolyline(newPolyline);
      }
    });
  }, [
    map,
    directionsService,
    showRoute,
    driverLocation,
    pickupLocation,
    destinationLocation,
    routePolyline,
  ]);

  // Fit bounds to show all markers
  useEffect(() => {
    if (!map) return;

    const bounds = new google.maps.LatLngBounds();

    bounds.extend({ lat: userLocation.latitude, lng: userLocation.longitude });

    if (driverLocation && !autoCenterOnDriver) {
      bounds.extend({
        lat: driverLocation.latitude,
        lng: driverLocation.longitude,
      });
    }

    if (pickupLocation) {
      bounds.extend({
        lat: pickupLocation.latitude,
        lng: pickupLocation.longitude,
      });
    }

    if (destinationLocation) {
      bounds.extend({
        lat: destinationLocation.latitude,
        lng: destinationLocation.longitude,
      });
    }

    if (!autoCenterOnDriver) {
      map.fitBounds(bounds);
    }
  }, [
    map,
    userLocation,
    driverLocation,
    pickupLocation,
    destinationLocation,
    autoCenterOnDriver,
  ]);

  return (
    <div
      ref={mapRef}
      style={{ width: "100%", height, borderRadius: "8px" }}
      className="shadow-md"
    />
  );
};
