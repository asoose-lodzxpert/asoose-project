// import { fetchPublic } from "@/services/auth-fetch"; // Removed because it was causing "No access token" error in some contexts
const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface NavigationStep {
  instruction: string;
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  endLocation: { latitude: number; longitude: number };
  maneuver?: string;
}

export interface DirectionsResponse {
  coordinates: { latitude: number; longitude: number }[];
  distance: { text: string; value: number };
  duration: { text: string; value: number };
  steps?: NavigationStep[];
  error?: string;
}

export interface DirectionsQuery {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export interface DistanceQuery {
  originLat: number;
  originLng: number;
  destLat: number;
  destLng: number;
}

export async function getDirections({
  originLat,
  originLng,
  destLat,
  destLng,
}: DirectionsQuery): Promise<DirectionsResponse> {
  const params = new URLSearchParams({
    originLat: originLat.toString(),
    originLng: originLng.toString(),
    destLat: destLat.toString(),
    destLng: destLng.toString(),
  }).toString();
  const url = `${EXPO_PUBLIC_API_URL}/maps/directions?${params}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}

/**
 * Gets the distance in meters between two lat/lng points by calling the backend API.
 *
 * Backend route required: GET /maps/distance?originLat=...&originLng=...&destLat=...&destLng=...
 * Should return: { distance: number }
 */
export interface DistanceResponse {
  distance: number;
}

export async function getDistanceMeters({
  originLat,
  originLng,
  destLat,
  destLng,
}: DistanceQuery): Promise<DistanceResponse> {
  const params = new URLSearchParams({
    originLat: originLat.toString(),
    originLng: originLng.toString(),
    destLat: destLat.toString(),
    destLng: destLng.toString(),
  }).toString();
  const url = `${EXPO_PUBLIC_API_URL}/maps/distance?${params}`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}

export async function fetchActiveLocations(): Promise<{ id: string; name: string; state: string }[]> {
  const url = `${EXPO_PUBLIC_API_URL}/maps/active-locations`;
  const res = await fetch(url, {
    method: "GET",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Request failed");
  }
  return res.json();
}
