/**
 * Reverse Geocoding Service
 * Converts coordinates to human-readable addresses.
 *
 * All calls are proxied through the backend (/maps/reverse-geocode) so the
 * Google Maps API key is NEVER sent to the browser.
 */

import { reverseGeocodeCoords } from "./maps-api.service";

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  state: string;
  country: string;
  placeId?: string;
}

export interface ReverseGeocodeError {
  code:
    | "API_ERROR"
    | "INVALID_COORDS"
    | "NO_RESULTS"
    | "NETWORK_ERROR"
    | "UNKNOWN";
  message: string;
  details?: string;
}

/**
 * Reverse geocode coordinates to address via the backend.
 *
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted address components
 * @throws ReverseGeocodeError
 */
export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<ReverseGeocodeResult> {
  if (!isValidCoordinate(lat, lng)) {
    throw {
      code: "INVALID_COORDS",
      message: "Invalid coordinates provided",
      details:
        "Latitude must be between -90 and 90, longitude between -180 and 180",
    } as ReverseGeocodeError;
  }

  try {
    const result = await reverseGeocodeCoords(lat, lng);
    return {
      address: result.address,
      // The backend returns a single formatted address; city/state/country
      // are not separately available from this endpoint.
      city: "",
      state: "",
      country: "",
      placeId: result.placeId,
    };
  } catch (error: any) {
    // Re-throw structured errors from the backend as-is
    if (error?.code && typeof error.code === "string") {
      throw error as ReverseGeocodeError;
    }

    if (error?.name === "AbortError") {
      throw {
        code: "NETWORK_ERROR",
        message: "Request timed out",
        details: "Please try again",
      } as ReverseGeocodeError;
    }

    throw {
      code: "UNKNOWN",
      message: "Failed to get address",
      details: error instanceof Error ? error.message : "Please try again",
    } as ReverseGeocodeError;
  }
}

/** Format error for display to users */
export function formatGeocodeError(error: ReverseGeocodeError): string {
  return error.details || error.message;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === "number" &&
    typeof lng === "number" &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}
