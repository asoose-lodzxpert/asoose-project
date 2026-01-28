import { fetchWithAuth } from "@/services/auth-fetch";
const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface DirectionsResponse {
  coordinates: { latitude: number; longitude: number }[];
  distance: { text: string; value: number };
  duration: { text: string; value: number };
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
  return await fetchWithAuth(url, { method: "GET" });
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
  return await fetchWithAuth(url, { method: "GET" });
}
