/**
 * useRideTrackingMap
 *
 * Manages all map-related state for the live tracking screen:
 *  - User's device location (GPS watch).
 *  - Static route polyline: pickup → dropoff.
 *  - Dynamic driver route: driver → pickup (approaching) or driver → destination (in progress).
 *  - ETA in minutes, throttled to at most one API call per ROUTE_RECALC_INTERVAL_MS.
 *  - Map camera fitting whenever relevant positions change.
 *
 * Performance notes:
 *  - Driver route is recalculated at most once every 30 s to avoid hammering the API.
 *  - fitMap is debounced with setTimeout(500) on initial ride load.
 *  - Subscriptions and timeouts are all cleaned up on unmount.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import * as Location from "expo-location";
import { get } from "@/lib/authFetch";
import { Ride } from "@/types/ride";
import { Dimensions } from "react-native";
import MapView from "react-native-maps";

/** Minimum ms between driver-route API calls regardless of location frequency */
const ROUTE_RECALC_INTERVAL_MS = 30_000;

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

  /** ETA in minutes for the driver's current leg (approaching or in-progress) */
  const [etaMinutes, setEtaMinutes] = useState<number | null>(null);

  const mapRef = useRef<MapView>(null);

  /** Timestamp of the most recent driver-route API call */
  const lastDriverRouteFetchMs = useRef<number>(0);

  // ── User location watch ────────────────────────────────────────────────────
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

  // ── Static pickup→dropoff polyline ─────────────────────────────────────────
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

  // ── Dynamic driver-route polyline + ETA ────────────────────────────────────
  // Throttled: at most one API call every ROUTE_RECALC_INTERVAL_MS.
  // Pre-trip  : driver → pickup
  // In-trip   : driver → dropoff
  const fetchDriverRoute = useCallback(
    async (force = false) => {
      if (!driverLocation || !currentRide) {
        setDriverRouteCoords([]);
        setEtaMinutes(null);
        return;
      }

      const st = currentRide.status as string;
      const isApproaching = [
        "DRIVER_ACCEPTED",
        "PAID",
        "ACCEPTED",
        "ARRIVED",
      ].includes(st);
      const isInProgress = st === "IN_PROGRESS";

      if (!isApproaching && !isInProgress) {
        setDriverRouteCoords([]);
        setEtaMinutes(null);
        return;
      }

      // Throttle — skip unless forced (e.g. ride status changed) or enough time elapsed
      const now = Date.now();
      if (
        !force &&
        now - lastDriverRouteFetchMs.current < ROUTE_RECALC_INTERVAL_MS
      ) {
        return;
      }
      lastDriverRouteFetchMs.current = now;

      // Destination for this leg
      const dest = isApproaching
        ? currentRide.pickupAddress
        : currentRide.dropoffAddress;
      if (!dest) return;

      try {
        const res = await get(
          `maps/directions?originLat=${driverLocation.latitude}&originLng=${driverLocation.longitude}&destLat=${dest.lat}&destLng=${dest.lng}`,
        );
        setDriverRouteCoords(
          Array.isArray(res?.coordinates) ? res.coordinates : [],
        );
        // Parse ETA if the API returns duration in seconds
        if (typeof res?.durationSeconds === "number") {
          setEtaMinutes(res.durationSeconds / 60);
        } else if (typeof res?.durationMin === "number") {
          setEtaMinutes(res.durationMin);
        }
      } catch {
        setDriverRouteCoords([]);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentRide?.status, driverLocation],
  );

  // ── Map camera fitting ─────────────────────────────────────────────────────
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

  // ── Effects ────────────────────────────────────────────────────────────────

  // On new ride: fetch static route + fit camera
  useEffect(() => {
    if (currentRide) {
      fetchRoute();
      // Force driver route fetch when ride changes (new ride / status flip)
      fetchDriverRoute(true);
      const timer = setTimeout(fitMap, 500);
      return () => clearTimeout(timer);
    } else {
      setRouteCoords([]);
      setDriverRouteCoords([]);
      setEtaMinutes(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentRide?.id, currentRide?.status]);

  // On driver location update: throttled route + ETA refresh; always refit camera
  useEffect(() => {
    if (driverLocation) {
      fetchDriverRoute(); // honours internal throttle
      fitMap();
    }
  }, [driverLocation, fetchDriverRoute, fitMap]);

  // Refit when user location changes during live trip
  useEffect(() => {
    if (userLocation) fitMap();
  }, [userLocation, fitMap]);

  return {
    mapRef,
    userLocation,
    routeCoords,
    driverRouteCoords,
    etaMinutes,
  };
}
