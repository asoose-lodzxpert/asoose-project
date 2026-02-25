/**
 * useDriverMarkerAnimation
 *
 * Encapsulates all logic for animating the driver car marker on the map:
 *  - Uses animateMarkerToCoordinate() (native UI-thread animation) for position.
 *  - Uses Animated.timing() for heading rotation (shortest angular path).
 *  - Suppresses GPS jitter by ignoring updates < MIN_DISTANCE_METERS.
 *  - Cancels in-flight rotation animation before starting the next one.
 *  - Cleans up all animations on unmount to prevent memory leaks.
 *
 * Architecture note: position animation runs on the native UI thread via
 * animateMarkerToCoordinate — this is the same mechanism Uber/Bolt use for
 * their smooth car movement. Heading rotation uses useNativeDriver=false
 * because it drives a view property (rotate) that cannot be handled natively
 * on react-native-maps markers.
 */
import { useRef, useCallback, useEffect } from "react";
import { Animated } from "react-native";
import { DriverLocation } from "@/types/ride";

/** Minimum movement in metres before we animate — filters GPS jitter */
const MIN_DISTANCE_METERS = 3;

/**
 * Duration of each position/heading animation step.
 * Should be slightly less than the location-emit interval so the
 * animation always finishes before the next update arrives.
 */
const ANIMATION_DURATION_MS = 1_400;

// ─── Geo helpers ────────────────────────────────────────────────────────────

function toRad(deg: number) {
  return (deg * Math.PI) / 180;
}

/** Haversine distance in meters between two lat/lng points */
function distMeters(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const R = 6_371_000;
  const dLat = toRad(b.latitude - a.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.latitude)) *
      Math.cos(toRad(b.latitude)) *
      Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.min(1, Math.sqrt(h)));
}

/** Geographic bearing from point a to point b, in degrees [0, 360) */
function calcBearing(
  a: { latitude: number; longitude: number },
  b: { latitude: number; longitude: number },
): number {
  const lat1 = toRad(a.latitude);
  const lat2 = toRad(b.latitude);
  const dLng = toRad(b.longitude - a.longitude);
  const y = Math.sin(dLng) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLng);
  return ((Math.atan2(y, x) * 180) / Math.PI + 360) % 360;
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export interface DriverMarkerAnimationResult {
  /** Attach this ref to the <Marker> element */
  markerRef: React.MutableRefObject<any>;
  /** Animated.Value driving the heading angle — interpolate to degrees string */
  rotationAnim: Animated.Value;
  /** Call this on every new DriverLocation from the WebSocket/context */
  animate: (location: DriverLocation) => void;
  /** True after the first valid location has been set */
  initialized: React.MutableRefObject<boolean>;
}

export function useDriverMarkerAnimation(): DriverMarkerAnimationResult {
  // Ref to the native Marker node — exposes animateMarkerToCoordinate()
  const markerRef = useRef<any>(null);

  // Whether we have set the initial position (no animation on first render)
  const initialized = useRef(false);

  // Previous position for distance/bearing calculations
  const prevRef = useRef<{ latitude: number; longitude: number } | null>(null);

  // Smooth heading rotation
  const rotationAnim = useRef(new Animated.Value(0)).current;
  const prevHeading = useRef(0);
  const headingAnimRef = useRef<Animated.CompositeAnimation | null>(null);

  const animate = useCallback(
    (location: DriverLocation) => {
      const { latitude, longitude, heading: rawHeading } = location;

      // ── Guard: validate coordinates ──────────────────────────────────────
      if (
        !Number.isFinite(latitude) ||
        !Number.isFinite(longitude) ||
        (latitude === 0 && longitude === 0)
      ) {
        return;
      }

      // ── First update: record position, no animation needed ───────────────
      // The <Marker coordinate={...}> prop handles the initial render position.
      if (!initialized.current || !prevRef.current) {
        prevRef.current = { latitude, longitude };
        prevHeading.current = rawHeading ?? 0;
        rotationAnim.setValue(rawHeading ?? 0);
        initialized.current = true;
        return;
      }

      // ── Jitter suppression ───────────────────────────────────────────────
      const dist = distMeters(prevRef.current, { latitude, longitude });
      if (dist < MIN_DISTANCE_METERS) {
        return;
      }

      // ── Bearing: prefer GPS heading; fall back to calculated bearing ─────
      const newBearing =
        rawHeading != null && rawHeading > 0
          ? rawHeading
          : calcBearing(prevRef.current, { latitude, longitude });

      // ── Native position animation (UI thread — zero JS overhead) ─────────
      // animateMarkerToCoordinate animates from the current displayed position
      // to the new one using the platform's native animation engine.
      if (markerRef.current?.animateMarkerToCoordinate) {
        markerRef.current.animateMarkerToCoordinate(
          { latitude, longitude },
          ANIMATION_DURATION_MS,
        );
      }

      // ── Heading rotation via shortest angular path ───────────────────────
      // Prevent spinning 350° the wrong way by normalising delta to [-180, 180].
      let delta = newBearing - prevHeading.current;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;

      // Cancel in-flight heading animation to prevent stacking
      if (headingAnimRef.current) {
        headingAnimRef.current.stop();
        headingAnimRef.current = null;
      }

      const headingAnim = Animated.timing(rotationAnim, {
        toValue: prevHeading.current + delta,
        duration: ANIMATION_DURATION_MS,
        useNativeDriver: false, // rotation on map markers cannot use native driver
      });
      headingAnimRef.current = headingAnim;
      headingAnim.start(({ finished }) => {
        if (finished) headingAnimRef.current = null;
      });

      // ── Commit updated state ─────────────────────────────────────────────
      prevRef.current = { latitude, longitude };
      prevHeading.current = newBearing;
    },
    [rotationAnim],
  );

  // Clean up on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      if (headingAnimRef.current) {
        headingAnimRef.current.stop();
        headingAnimRef.current = null;
      }
    };
  }, []);

  return { markerRef, rotationAnim, animate, initialized };
}
