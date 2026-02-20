/**
 * Maps API Service
 *
 * Proxies all map-related calls (autocomplete, geocode, reverse-geocode)
 * through the backend so the Google Maps API key is NEVER exposed to the
 * browser.  The backend uses a server-only GOOGLE_MAPS_API_KEY env variable.
 */

import { ApiService } from "./api.service";

// ─── Types ────────────────────────────────────────────────────────────────────

/** A single autocomplete suggestion returned by /maps/address-search */
export interface PlaceSuggestion {
  id: string; // Google Place ID
  title: string; // Main text (e.g. "Victoria Island")
  subtitle: string; // Secondary text (e.g. "Lagos, Nigeria")
}

/** Resolved coordinates + address for a place */
export interface PlaceLocation {
  lat: number;
  lng: number;
  address: string;
  placeId?: string;
}

// ─── Autocomplete ─────────────────────────────────────────────────────────────

/**
 * Search for place suggestions via the backend.
 * Requires the user to be authenticated (JwtAuthGuard on the backend).
 *
 * @param query     - User input (minimum 3 characters)
 * @param latitude  - Optional bias latitude
 * @param longitude - Optional bias longitude
 */
export async function searchPlaces(
  query: string,
  latitude?: number,
  longitude?: number,
): Promise<PlaceSuggestion[]> {
  if (!query || query.trim().length < 3) return [];

  const params = new URLSearchParams({ query: query.trim() });
  if (latitude != null) params.set("latitude", String(latitude));
  if (longitude != null) params.set("longitude", String(longitude));

  try {
    return await ApiService.request<PlaceSuggestion[]>(
      `/maps/address-search?${params}`,
    );
  } catch {
    return [];
  }
}

// ─── Place Details (Geocode) ───────────────────────────────────────────────────

/**
 * Resolve a Google Place ID to coordinates via the backend.
 * No authentication required.
 *
 * @param placeId - The Google Place ID to resolve
 */
export async function geocodePlace(placeId: string): Promise<PlaceLocation> {
  return ApiService.request<PlaceLocation>(
    `/maps/geocode?placeId=${encodeURIComponent(placeId)}`,
  );
}

// ─── Reverse Geocode ──────────────────────────────────────────────────────────

/**
 * Convert raw GPS coordinates to a human-readable address via the backend.
 * No authentication required.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 */
export async function reverseGeocodeCoords(
  lat: number,
  lng: number,
): Promise<PlaceLocation & { placeId: string }> {
  return ApiService.request<PlaceLocation & { placeId: string }>(
    `/maps/reverse-geocode?lat=${lat}&lng=${lng}`,
  );
}
