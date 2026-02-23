/**
 * Service Area Bounds
 *
 * Bounds are fetched from the backend (GET /maps/service-bounds) which reads
 * active ServiceZone records from the database — the single source of truth.
 *
 * A Maiduguri fallback is baked in so the app works offline / before the
 * first fetch completes.  Call loadServiceBounds() once at app startup
 * (already done in app/_layout.tsx).
 */

import AsyncStorage from "@react-native-async-storage/async-storage";

const _API_BASE: string = (
  process.env.EXPO_PUBLIC_API_URL ?? ""
).replace(/\/+$/, "");

export interface ServiceBounds {
  name: string;
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

// ── Maiduguri fallback ────────────────────────────────────────────────────────
const FALLBACK_BOUNDS: ServiceBounds[] = [
  { name: "Maiduguri", minLat: 11.7, maxLat: 11.95, minLng: 13.0, maxLng: 13.3 },
];

// Private mutable cache — updated by loadServiceBounds()
let _activeBounds: ServiceBounds[] = [...FALLBACK_BOUNDS];

/**
 * Default map center object.  Its properties are updated in-place when
 * loadServiceBounds() succeeds, so all existing imports stay in sync.
 */
export const DEFAULT_MAP_CENTER = {
  latitude: 11.83,
  longitude: 13.15,
  latitudeDelta: 0.18,
  longitudeDelta: 0.18,
};

// ── AsyncStorage cache ────────────────────────────────────────────────────────
const CACHE_KEY = "asoose_service_bounds_v1";
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours

// ── Core helpers ──────────────────────────────────────────────────────────────

/** true if (lat, lng) is inside at least one active service zone */
export function isWithinServiceBounds(lat: number, lng: number): boolean {
  if (!lat || !lng || (lat === 0 && lng === 0)) return false;
  return _activeBounds.some(
    (b) =>
      lat >= b.minLat && lat <= b.maxLat && lng >= b.minLng && lng <= b.maxLng,
  );
}

/** Human-readable list of active service area names e.g. "Maiduguri" */
export function getServiceAreaNames(): string {
  return _activeBounds.map((b) => b.name).join(", ");
}

/** MapView region that fits all active bounds (fallback initialRegion) */
export function getCombinedMapRegion() {
  const lats = _activeBounds.flatMap((b) => [b.minLat, b.maxLat]);
  const lngs = _activeBounds.flatMap((b) => [b.minLng, b.maxLng]);
  const minLat = Math.min(...lats);
  const maxLat = Math.max(...lats);
  const minLng = Math.min(...lngs);
  const maxLng = Math.max(...lngs);
  return {
    latitude: (minLat + maxLat) / 2,
    longitude: (minLng + maxLng) / 2,
    latitudeDelta: (maxLat - minLat) * 1.3,
    longitudeDelta: (maxLng - minLng) * 1.3,
  };
}

// ── Remote load ───────────────────────────────────────────────────────────────

type RemoteBoundsPayload = {
  bounds: Array<ServiceBounds & { center?: { lat: number; lng: number } }>;
  defaultCenter: {
    latitude: number;
    longitude: number;
    latitudeDelta: number;
    longitudeDelta: number;
  };
};

function applyPayload(payload: RemoteBoundsPayload) {
  if (Array.isArray(payload.bounds) && payload.bounds.length > 0) {
    _activeBounds = payload.bounds.map(({ name, minLat, maxLat, minLng, maxLng }) => ({
      name,
      minLat,
      maxLat,
      minLng,
      maxLng,
    }));
  }
  if (payload.defaultCenter) {
    Object.assign(DEFAULT_MAP_CENTER, payload.defaultCenter);
  }
}

/**
 * Fetches active service bounds from the backend and updates the in-memory
 * cache.  Safe to call multiple times — results are cached in AsyncStorage
 * for 6 hours so subsequent app launches are instant.
 *
 * Falls back silently to the hardcoded Maiduguri bounds on any error.
 */
export async function loadServiceBounds(): Promise<void> {
  try {
    // 1. Try AsyncStorage cache first (fast path)
    const raw = await AsyncStorage.getItem(CACHE_KEY);
    if (raw) {
      const { payload, timestamp } = JSON.parse(raw) as {
        payload: RemoteBoundsPayload;
        timestamp: number;
      };
      if (Date.now() - timestamp < CACHE_TTL_MS) {
        applyPayload(payload);
        // Still refresh in background if older than 1 hour
        if (Date.now() - timestamp > 60 * 60 * 1000) fetchAndCache();
        return;
      }
    }
    // 2. Cache miss or expired — fetch fresh
    await fetchAndCache();
  } catch {
    // Network or storage error — fallback bounds already in place
  }
}

async function fetchAndCache(): Promise<void> {
  const res = await fetch(
    `${_API_BASE}/maps/service-bounds`,
    {
      headers: {
        ...(typeof __DEV__ !== "undefined" && __DEV__
          ? { "ngrok-skip-browser-warning": "true" }
          : {}),
      },
    },
  );
  if (!res.ok) throw new Error(`service-bounds: ${res.status}`);
  const payload = (await res.json()) as RemoteBoundsPayload;
  applyPayload(payload);
  await AsyncStorage.setItem(
    CACHE_KEY,
    JSON.stringify({ payload, timestamp: Date.now() }),
  );
}

