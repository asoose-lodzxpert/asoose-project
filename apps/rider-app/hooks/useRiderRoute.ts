/**
 * useRiderRoute
 *
 * Manages all route state for the rider map:
 *
 *   • plannedRoute  — pickup → dropoff overview (fetched once per active job)
 *   • liveRoute     — rider → current destination (throttled refresh, force on status change)
 *   • Turn-by-turn  — currentInstruction, nextInstruction, turnIcon
 *   • ETA / distance remaining after each live-route refresh
 *
 * Design goals:
 *   - No concurrent duplicate fetches (isFetchingRef guard)
 *   - 30-second throttle between live-route fetches (configurable)
 *   - Force immediate re-fetch when job status changes to an en-route state
 *   - Step tracking: advance step card as rider passes each maneuver waypoint
 *   - All state cleared when rider is no longer en-route
 *   - fitBoundsToJob() helper passed as a callback for MapCanvas to call on job start
 */

import { LatLng } from "react-native-maps";
import { useCallback, useEffect, useRef, useState } from "react";

import { getDirections, NavigationStep } from "@/services/maps";
import { CurrentJob, JobStatus } from "@/types/job";
import { RiderLocation } from "@/hooks/useRiderLocation";

// ─────────────────────────────────────────────────────────────────────────────
//  Constants
// ─────────────────────────────────────────────────────────────────────────────

/** Minimum gap between live-route refreshes in milliseconds */
const LIVE_ROUTE_THROTTLE_MS = 30_000;

/** Distance threshold in metres to consider a nav step as "passed" */
const STEP_PASSED_THRESHOLD_M = 40;

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Rough metre distance between two lat/lng deltas (equirectangular approx) */
function deltaToMetres(dLat: number, dLng: number): number {
  return Math.sqrt(dLat * dLat + dLng * dLng) * 111_320;
}

/** Maps a turn instruction string to an SF Symbol icon name */
export function instructionToIcon(instruction: string): string {
  const lower = instruction.toLowerCase();
  if (lower.includes("u-turn") || lower.includes("uturn"))
    return "arrow.uturn.left";
  if (lower.includes("turn left") || lower.includes("left"))
    return "arrow.turn.up.left";
  if (lower.includes("turn right") || lower.includes("right"))
    return "arrow.turn.up.right";
  if (lower.includes("keep left") || lower.includes("bear left"))
    return "arrow.up.left";
  if (lower.includes("keep right") || lower.includes("bear right"))
    return "arrow.up.right";
  return "arrow.up";
}

// ─────────────────────────────────────────────────────────────────────────────
//  Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UseRiderRouteResult {
  /** Rider → current destination polyline (en-route states only) */
  riderRouteCoords: LatLng[];
  /** Pickup → dropoff overview polyline (shown at-pickup / en-route-dropoff) */
  plannedRouteCoords: LatLng[];
  /** Human-readable distance remaining, e.g. "1.2 km" */
  distanceLeft: string;
  /** Human-readable ETA, e.g. "5 mins" */
  eta: string;
  /** Current maneuver instruction text */
  currentInstruction: string;
  /** The upcoming maneuver instruction text */
  nextInstruction: string;
  /** SF Symbol name for current maneuver icon */
  turnIcon: string;
  /** Full step list for the active live route */
  routeSteps: NavigationStep[];
  /** Manually trigger a live-route refresh (bypasses throttle) */
  forceRefreshRoute: () => void;
}

export interface UseRiderRouteParams {
  location: RiderLocation | null;
  status: JobStatus;
  activeJob: CurrentJob | null;
  pickupCoords: LatLng | null;
  dropoffCoords: LatLng | null;
}

// ─────────────────────────────────────────────────────────────────────────────
//  Hook
// ─────────────────────────────────────────────────────────────────────────────

export function useRiderRoute({
  location,
  status,
  activeJob,
  pickupCoords,
  dropoffCoords,
}: UseRiderRouteParams): UseRiderRouteResult {
  // ── State ──────────────────────────────────────────────────────────────────
  const [riderRouteCoords, setRiderRouteCoords] = useState<LatLng[]>([]);
  const [plannedRouteCoords, setPlannedRouteCoords] = useState<LatLng[]>([]);
  const [distanceLeft, setDistanceLeft] = useState("");
  const [eta, setEta] = useState("");
  const [routeSteps, setRouteSteps] = useState<NavigationStep[]>([]);
  const [currentInstruction, setCurrentInstruction] = useState("");
  const [nextInstruction, setNextInstruction] = useState("");
  const [turnIcon, setTurnIcon] = useState("arrow.up");

  // ── Refs (avoid stale closures + guard concurrent fetches) ─────────────────
  const lastLiveRouteFetchRef = useRef<number>(0);
  const isFetchingLiveRef = useRef(false);
  const isFetchingPlannedRef = useRef(false);

  // Keep a stable ref to the latest location so the status-change effect can
  // immediately trigger a fetch without depending on `location` in deps.
  const locationRef = useRef<RiderLocation | null>(location);
  useEffect(() => {
    locationRef.current = location;
  }, [location]);

  // ── Helpers ────────────────────────────────────────────────────────────────

  const clearLiveRoute = useCallback(() => {
    setRiderRouteCoords([]);
    setDistanceLeft("");
    setEta("");
    setRouteSteps([]);
    setCurrentInstruction("");
    setNextInstruction("");
    setTurnIcon("arrow.up");
    lastLiveRouteFetchRef.current = 0;
  }, []);

  // ── Planned route: pickup → dropoff ───────────────────────────────────────
  //    Fetched once per active job ID. Cleared when job is absent.

  useEffect(() => {
    if (!activeJob || !pickupCoords || !dropoffCoords) {
      setPlannedRouteCoords([]);
      return;
    }

    if (isFetchingPlannedRef.current) return;
    isFetchingPlannedRef.current = true;

    (async () => {
      try {
        const { coordinates, error } = await getDirections({
          originLat: pickupCoords.latitude,
          originLng: pickupCoords.longitude,
          destLat: dropoffCoords.latitude,
          destLng: dropoffCoords.longitude,
        });
        if (!error && coordinates?.length) {
          setPlannedRouteCoords(coordinates);
        }
      } catch {
        // Non-fatal — planned route is just for visual context
      } finally {
        isFetchingPlannedRef.current = false;
      }
    })();
    // Re-fetch when job id or destination coords change (multi-stop advances)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    activeJob?.id,
    pickupCoords?.latitude,
    pickupCoords?.longitude,
    dropoffCoords?.latitude,
    dropoffCoords?.longitude,
  ]);

  // ── Live route fetch ────────────────────────────────────────────────────────

  const fetchLiveRoute = useCallback(
    async (force = false) => {
      const loc = locationRef.current;

      if (!loc || !activeJob) {
        clearLiveRoute();
        return;
      }

      // Throttle unless forced
      const now = Date.now();
      if (
        !force &&
        now - lastLiveRouteFetchRef.current < LIVE_ROUTE_THROTTLE_MS
      )
        return;

      // Don't run concurrent fetches
      if (isFetchingLiveRef.current) return;
      isFetchingLiveRef.current = true;
      lastLiveRouteFetchRef.current = now;

      // Determine destination
      let dest: LatLng | null = null;
      if (status === "en-route-pickup") dest = pickupCoords;
      else if (status === "en-route-dropoff") dest = dropoffCoords;

      if (!dest) {
        clearLiveRoute();
        isFetchingLiveRef.current = false;
        return;
      }

      try {
        const { coordinates, distance, duration, steps, error } =
          await getDirections({
            originLat: loc.latitude,
            originLng: loc.longitude,
            destLat: dest.latitude,
            destLng: dest.longitude,
          });

        if (error || !coordinates?.length) {
          isFetchingLiveRef.current = false;
          return;
        }

        setRiderRouteCoords(coordinates);
        setDistanceLeft(distance?.text ?? "");
        setEta(duration?.text ?? "");

        if (steps?.length) {
          setRouteSteps(steps);
          setCurrentInstruction(steps[0]?.instruction ?? "");
          setNextInstruction(steps[1]?.instruction ?? "");
          setTurnIcon(instructionToIcon(steps[0]?.instruction ?? ""));
        }
      } catch {
        // Non-fatal — keep last known route visible
      } finally {
        isFetchingLiveRef.current = false;
      }
    },
    // Note: we intentionally exclude `location` here to keep this stable;
    // we access it via `locationRef` instead.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [status, activeJob?.id, pickupCoords, dropoffCoords, clearLiveRoute],
  );

  // ── Status change → immediate forced route fetch ───────────────────────────

  const isEnRoute =
    status === "en-route-pickup" || status === "en-route-dropoff";

  useEffect(() => {
    if (isEnRoute) {
      fetchLiveRoute(/* force */ true);
    } else {
      clearLiveRoute();
    }
    // We ONLY want this to run on status / activeJob changes, not on every
    // location update. Location-driven refreshes are handled by the effect below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, activeJob?.id]);

  // ── Location change → throttled live-route refresh ─────────────────────────

  useEffect(() => {
    if (!isEnRoute || !location) return;
    fetchLiveRoute(/* force */ false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location, isEnRoute]);

  // ── Step tracking: advance instruction card as waypoints are passed ─────────

  useEffect(() => {
    if (!location || routeSteps.length === 0) return;

    const { latitude: rLat, longitude: rLng } = location;

    let activeIdx = routeSteps.length - 1;
    for (let i = 0; i < routeSteps.length; i++) {
      const step = routeSteps[i];
      const dist = deltaToMetres(
        step.endLocation.latitude - rLat,
        step.endLocation.longitude - rLng,
      );
      if (dist > STEP_PASSED_THRESHOLD_M) {
        activeIdx = i;
        break;
      }
    }

    const instruction = routeSteps[activeIdx]?.instruction ?? "";
    setCurrentInstruction(instruction);
    setNextInstruction(routeSteps[activeIdx + 1]?.instruction ?? "");
    setTurnIcon(instructionToIcon(instruction));
  }, [location, routeSteps]);

  // ── Public refresh trigger ─────────────────────────────────────────────────

  const forceRefreshRoute = useCallback(() => {
    fetchLiveRoute(true);
  }, [fetchLiveRoute]);

  return {
    riderRouteCoords,
    plannedRouteCoords,
    distanceLeft,
    eta,
    currentInstruction,
    nextInstruction,
    turnIcon,
    routeSteps,
    forceRefreshRoute,
  };
}
