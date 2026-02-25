/**
 * useRiderLocation
 *
 * Manages the rider's GPS location subscription with:
 * - Foreground permission request
 * - Immediate position fetch on mount
 * - Continuous high-accuracy watch (2 s / 5 m — best for navigation)
 * - AppState awareness: pauses watcher when backgrounded, resumes on foreground
 * - Clean subscription teardown on unmount
 *
 * Returns a stable RiderLocation object (values only change when the physical
 * position/heading actually changes — not on every render).
 */

import * as Location from "expo-location";
import { useEffect, useRef, useState } from "react";
import { AppState, AppStateStatus } from "react-native";

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export interface RiderLocation {
  latitude: number;
  longitude: number;
  /**
   * Compass heading in degrees [0, 360).
   * 0 = north. Falls back to 0 when the device does not report heading
   * (e.g. GPS without compass, or heading < 0 from the OS).
   */
  heading: number;
  accuracy: number; // metres
  speed: number; // m/s
  timestamp: number; // epoch ms
}

export interface UseRiderLocationResult {
  location: RiderLocation | null;
  permissionDenied: boolean;
  error: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Private helpers
// ─────────────────────────────────────────────────────────────────────────────

function toRiderLocation(loc: Location.LocationObject): RiderLocation {
  const { latitude, longitude, heading, accuracy, speed } = loc.coords;
  return {
    latitude,
    longitude,
    // heading is -1 when device can't compute it (no compass / stationary)
    heading: heading != null && heading >= 0 ? heading : 0,
    accuracy: accuracy ?? 20,
    speed: speed ?? 0,
    timestamp: loc.timestamp,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useRiderLocation(): UseRiderLocationResult {
  const [location, setLocation] = useState<RiderLocation | null>(null);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Subscription reference — cleaned up on unmount or when backgrounded
  const subRef = useRef<Location.LocationSubscription | null>(null);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Guard against launching multiple concurrent startWatching calls
  const startingRef = useRef(false);

  const stopWatching = () => {
    subRef.current?.remove();
    subRef.current = null;
  };

  const startWatching = async () => {
    // Already running or already starting — skip
    if (subRef.current || startingRef.current) return;
    startingRef.current = true;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== "granted") {
        setPermissionDenied(true);
        setError("Location permission denied. Please enable it in Settings.");
        startingRef.current = false;
        return;
      }

      setPermissionDenied(false);

      // Immediately surface a position before the watcher delivers its first fix.
      // Use Balanced accuracy here because getting a High-accuracy fix cold can
      // take several seconds.
      try {
        const initial = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setLocation(toRiderLocation(initial));
        setError(null);
      } catch {
        // Non-fatal: the watcher will deliver the first fix shortly
      }

      // Start continuous, high-accuracy watch for navigation quality
      subRef.current = await Location.watchPositionAsync(
        {
          accuracy: Location.Accuracy.High,
          timeInterval: 2000, // every 2 s
          distanceInterval: 5, // OR every 5 m — whichever fires first
        },
        (loc) => setLocation(toRiderLocation(loc)),
      );
    } catch (e) {
      setError(`GPS error: ${String(e)}`);
    } finally {
      startingRef.current = false;
    }
  };

  useEffect(() => {
    startWatching();

    const appStateSub = AppState.addEventListener(
      "change",
      (next: AppStateStatus) => {
        const prev = appStateRef.current;
        appStateRef.current = next;

        if (prev.match(/inactive|background/) && next === "active") {
          // App returned to foreground — restart watcher (it was paused)
          startWatching();
        } else if (next.match(/inactive|background/)) {
          // App went to background — stop high-accuracy watcher to save battery.
          // The location-stream service handles background location separately.
          stopWatching();
        }
      },
    );

    return () => {
      stopWatching();
      appStateSub.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { location, permissionDenied, error };
}
