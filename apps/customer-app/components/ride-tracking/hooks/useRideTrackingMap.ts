import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { get } from "@/lib/authFetch";
import { Ride } from "@/types/ride";
import { Dimensions } from "react-native";
import MapView from "react-native-maps";

export function useRideTrackingMap(
  currentRide: Ride | null,
  driverLocation: { latitude: number; longitude: number } | null,
) {
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  const [routeCoords, setRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const [driverRouteCoords, setDriverRouteCoords] = useState<
    { latitude: number; longitude: number }[]
  >([]);

  const mapRef = useRef<MapView>(null);

  // Watch user location
  useEffect(() => {
    let subscription: Location.LocationSubscription | null = null;

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") return;

      const loc = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setUserLocation(loc.coords);

      subscription = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 3000,
          distanceInterval: 10,
        },
        (location) => setUserLocation(location.coords),
      );
    })();

    return () => {
      subscription?.remove();
    };
  }, []);

  // Fetch pickup → dropoff route
  const fetchRoute = useCallback(async () => {
    if (!currentRide?.pickupAddress || !currentRide?.dropoffAddress) return;

    const { pickupAddress: p, dropoffAddress: d } = currentRide;
    try {
      const res = await get(
        `maps/directions?originLat=${p.lat}&originLng=${p.lng}&destLat=${d.lat}&destLng=${d.lng}`,
      );
      setRouteCoords(Array.isArray(res?.coordinates) ? res.coordinates : []);
    } catch {
      setRouteCoords([]);
    }
  }, [currentRide?.pickupAddress, currentRide?.dropoffAddress]);

  // Fetch driver → pickup route (when approaching)
  const fetchDriverRoute = useCallback(async () => {
    if (!currentRide?.pickupAddress || !driverLocation) {
      setDriverRouteCoords([]);
      return;
    }

    const approachingStatuses = [
      "DRIVER_ACCEPTED",
      "PAID",
      "ACCEPTED",
      "ARRIVED",
    ];
    if (!approachingStatuses.includes(currentRide.status ?? "")) {
      setDriverRouteCoords([]);
      return;
    }

    const p = currentRide.pickupAddress;
    try {
      const res = await get(
        `maps/directions?originLat=${driverLocation.latitude}&originLng=${driverLocation.longitude}&destLat=${p.lat}&destLng=${p.lng}`,
      );
      setDriverRouteCoords(
        Array.isArray(res?.coordinates) ? res.coordinates : [],
      );
    } catch {
      setDriverRouteCoords([]);
    }
  }, [currentRide?.pickupAddress, currentRide?.status, driverLocation]);

  // Fit map to relevant coordinates
  const fitMap = useCallback(() => {
    if (!mapRef.current) return;

    const coords: { latitude: number; longitude: number }[] = [];

    if (currentRide?.pickupAddress) {
      coords.push({
        latitude: currentRide.pickupAddress.lat,
        longitude: currentRide.pickupAddress.lng,
      });
    }
    if (currentRide?.dropoffAddress) {
      coords.push({
        latitude: currentRide.dropoffAddress.lat,
        longitude: currentRide.dropoffAddress.lng,
      });
    }
    if (driverLocation) coords.push(driverLocation);
    if (userLocation && currentRide?.status === "IN_PROGRESS") {
      coords.push(userLocation);
    }

    if (coords.length === 0) return;

    mapRef.current.fitToCoordinates(coords, {
      edgePadding: {
        top: 90,
        right: 40,
        bottom: Dimensions.get("window").height * 0.44,
        left: 40,
      },
      animated: true,
    });
  }, [currentRide, driverLocation, userLocation]);

  useEffect(() => {
    if (currentRide) {
      fetchRoute();
      const timer = setTimeout(fitMap, 500);
      return () => clearTimeout(timer);
    } else {
      setRouteCoords([]);
      setDriverRouteCoords([]);
    }
  }, [currentRide?.id, fetchRoute, fitMap]);

  useEffect(() => {
    fetchDriverRoute();
  }, [fetchDriverRoute]);

  useEffect(() => {
    if (driverLocation || userLocation) fitMap();
  }, [driverLocation, userLocation, fitMap]);

  return {
    mapRef,
    userLocation,
    routeCoords,
    driverRouteCoords,
  };
}
