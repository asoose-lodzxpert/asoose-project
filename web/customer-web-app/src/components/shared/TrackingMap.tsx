"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader } from "@googlemaps/js-api-loader";

export interface MapLocation {
  latitude: number;
  longitude: number;
  heading?: number;
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
}

const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY || "";
// REQUIRED: Advanced Markers only work with a Map ID.
// Use "DEMO_MAP_ID" for dev, but create a real one in Google Cloud Console for prod.
const MAP_ID = process.env.NEXT_PUBLIC_GOOGLE_MAP_ID || "DEMO_MAP_ID";

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

  // Store marker references. Note the type change to AdvancedMarkerElement
  const [markers, setMarkers] = useState<{
    user?: google.maps.marker.AdvancedMarkerElement;
    driver?: google.maps.marker.AdvancedMarkerElement;
    pickup?: google.maps.marker.AdvancedMarkerElement;
    destination?: google.maps.marker.AdvancedMarkerElement;
  }>({});

  const [routePolyline, setRoutePolyline] =
    useState<google.maps.Polyline | null>(null);
  const [directionsService, setDirectionsService] =
    useState<google.maps.DirectionsService | null>(null);

  // We need to keep a reference to the driver's content element to rotate it efficiently
  const driverContentRef = useRef<HTMLDivElement | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapRef.current || map) return;

    const loader = new Loader({
      apiKey: GOOGLE_MAPS_API_KEY,
      version: "weekly",
      libraries: ["marker", "maps", "routes"], // Explicitly request 'marker' library
    });

    const initMap = async () => {
      // 1. Load the script (bypass TS check if needed)
      await (loader as any).load();

      // 2. Import libraries using the global google object
      const { Map } = (await google.maps.importLibrary(
        "maps",
      )) as google.maps.MapsLibrary;
      const { AdvancedMarkerElement, PinElement } =
        (await google.maps.importLibrary(
          "marker",
        )) as google.maps.MarkerLibrary;

      const newMap = new Map(mapRef.current!, {
        center: { lat: userLocation.latitude, lng: userLocation.longitude },
        zoom,
        mapId: MAP_ID,
        disableDefaultUI: false,
        zoomControl: true,
        mapTypeControl: false,
        streetViewControl: false,
        fullscreenControl: true,
      });

      setMap(newMap);

      const { DirectionsService } = (await google.maps.importLibrary(
        "routes",
      )) as google.maps.RoutesLibrary;
      setDirectionsService(new DirectionsService());
    };

    initMap();
  }, [map, userLocation, zoom]);

  // Update user marker (Blue Dot)
  useEffect(() => {
    if (!map) return;

    const updateUserMarker = async () => {
      const { AdvancedMarkerElement, PinElement } =
        (await google.maps.importLibrary(
          "marker",
        )) as google.maps.MarkerLibrary;

      if (markers.user) {
        markers.user.position = {
          lat: userLocation.latitude,
          lng: userLocation.longitude,
        };
      } else {
        // Create a blue circle using PinElement
        const pin = new PinElement({
          background: "#4285F4",
          borderColor: "#FFFFFF",
          glyph: "", // No icon inside
          scale: 1.2,
        });

        const userMarker = new AdvancedMarkerElement({
          map,
          position: { lat: userLocation.latitude, lng: userLocation.longitude },
          title: "Your Location",
          content: pin.element,
        });

        setMarkers((prev) => ({ ...prev, user: userMarker }));
      }
    };

    updateUserMarker();
  }, [map, userLocation, markers.user]);

  // Update driver marker (Green Arrow)
  useEffect(() => {
    if (!map || !driverLocation) return;

    const updateDriverMarker = async () => {
      const { AdvancedMarkerElement } = (await google.maps.importLibrary(
        "marker",
      )) as google.maps.MarkerLibrary;

      if (markers.driver) {
        markers.driver.position = {
          lat: driverLocation.latitude,
          lng: driverLocation.longitude,
        };

        // Rotate the existing DOM element
        if (driverContentRef.current && driverLocation.heading !== undefined) {
          driverContentRef.current.style.transform = `rotate(${driverLocation.heading}deg)`;
        }
      } else {
        // Create a custom arrow SVG for the driver
        const iconDiv = document.createElement("div");
        iconDiv.style.width = "30px";
        iconDiv.style.height = "30px";
        iconDiv.style.display = "flex";
        iconDiv.style.alignItems = "center";
        iconDiv.style.justifyContent = "center";
        iconDiv.style.transition = "transform 0.3s ease"; // Smooth rotation

        // SVG Arrow (Green with white border)
        iconDiv.innerHTML = `
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
             <path d="M12 2L4.5 20.29C4.21 21 4.96 21.72 5.63 21.39L12 18.25L18.37 21.39C19.04 21.72 19.79 21 19.5 20.29L12 2Z" fill="#34A853" stroke="white" stroke-width="2"/>
          </svg>
        `;

        if (driverLocation.heading) {
          iconDiv.style.transform = `rotate(${driverLocation.heading}deg)`;
        }

        driverContentRef.current = iconDiv;

        const driverMarker = new AdvancedMarkerElement({
          map,
          position: {
            lat: driverLocation.latitude,
            lng: driverLocation.longitude,
          },
          title: "Driver",
          content: iconDiv,
        });

        setMarkers((prev) => ({ ...prev, driver: driverMarker }));
      }

      // Auto-center on driver
      if (autoCenterOnDriver) {
        map.panTo({
          lat: driverLocation.latitude,
          lng: driverLocation.longitude,
        });
      }
    };

    updateDriverMarker();
  }, [map, driverLocation, markers.driver, autoCenterOnDriver]);

  // Update pickup marker
  useEffect(() => {
    if (!map || !pickupLocation) {
      if (markers.pickup) {
        markers.pickup.map = null;
        setMarkers((prev) => ({ ...prev, pickup: undefined }));
      }
      return;
    }

    const updatePickup = async () => {
      const { AdvancedMarkerElement, PinElement } =
        (await google.maps.importLibrary(
          "marker",
        )) as google.maps.MarkerLibrary;

      if (markers.pickup) {
        markers.pickup.position = {
          lat: pickupLocation.latitude,
          lng: pickupLocation.longitude,
        };
      } else {
        const pin = new PinElement({
          scale: 1,
          glyphColor: "white",
          background: "#EA4335", // Red
          borderColor: "#B31412",
        });

        const pickupMarker = new AdvancedMarkerElement({
          map,
          position: {
            lat: pickupLocation.latitude,
            lng: pickupLocation.longitude,
          },
          title: "Pickup Location",
          content: pin.element,
        });

        setMarkers((prev) => ({ ...prev, pickup: pickupMarker }));
      }
    };
    updatePickup();
  }, [map, pickupLocation, markers.pickup]);

  // Update destination marker
  useEffect(() => {
    if (!map || !destinationLocation) {
      if (markers.destination) {
        markers.destination.map = null;
        setMarkers((prev) => ({ ...prev, destination: undefined }));
      }
      return;
    }

    const updateDestination = async () => {
      const { AdvancedMarkerElement, PinElement } =
        (await google.maps.importLibrary(
          "marker",
        )) as google.maps.MarkerLibrary;

      if (markers.destination) {
        markers.destination.position = {
          lat: destinationLocation.latitude,
          lng: destinationLocation.longitude,
        };
      } else {
        const pin = new PinElement({
          scale: 1,
          glyphColor: "white",
          background: "#FBBC04", // Yellow/Orange
          borderColor: "#EA8600",
        });

        const destinationMarker = new AdvancedMarkerElement({
          map,
          position: {
            lat: destinationLocation.latitude,
            lng: destinationLocation.longitude,
          },
          title: "Destination",
          content: pin.element,
        });

        setMarkers((prev) => ({ ...prev, destination: destinationMarker }));
      }
    };
    updateDestination();
  }, [map, destinationLocation, markers.destination]);

  // Draw route
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
        if (routePolyline) {
          routePolyline.setMap(null);
        }

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
  ]);

  // Fit bounds
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
