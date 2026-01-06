import { Address } from "@/types/address";

const GOOGLE_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_KEY || "";

export const fetchSuggestions = async (input: string): Promise<any[]> => {
  if (!input) return [];
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/autocomplete/json?key=${GOOGLE_API_KEY}&input=${encodeURIComponent(
      input
    )}`
  );
  const json = await res.json();
  return json.predictions || [];
};

export const selectPlace = async (placeId: string): Promise<Address | null> => {
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/place/details/json?key=${GOOGLE_API_KEY}&place_id=${placeId}`
  );
  const json = await res.json();
  const place = json.result;
  if (!place || !place.geometry?.location) return null;
  return {
    id: Date.now().toString(),
    label: "Other",
    address: place.formatted_address,
    coordinates: {
      lat: place.geometry.location.lat.toString(),
      lng: place.geometry.location.lng.toString(),
    },
    isDefault: false,
  };
};

/**
 * Resolves a full address from latitude and longitude using Google Maps Geocoding API.
 * @param coords Object with lat and lng (number or string)
 * @returns {Promise<{ address: string } | null>}
 */
export const resolveAddressFromCoords = async (coords: {
  lat: number | string;
  lng: number | string;
}): Promise<{ address: string } | null> => {
  const lat =
    typeof coords.lat === "string" ? coords.lat : coords.lat.toString();
  const lng =
    typeof coords.lng === "string" ? coords.lng : coords.lng.toString();
  const res = await fetch(
    `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_API_KEY}`
  );
  const json = await res.json();
  if (json.status === "OK" && json.results && json.results.length > 0) {
    return { address: json.results[0].formatted_address };
  }
  return null;
};
