import { request } from "@/lib/authFetch";
import { Address } from "@/types/address";

const GOOGLE_MAPS_API_KEY = process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY;

export const fetchSuggestions = async (input: string): Promise<any[]> => {
  if (!input) return [];
  try {
    // Use Google Places Autocomplete API directly
    const response = await fetch(
      `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(input)}&key=${GOOGLE_MAPS_API_KEY}`,
    );
    const data = await response.json();

    if (!data.predictions) return [];

    // Transform Google's response to match expected format
    return data.predictions.map((item: any) => ({
      place_id: item.place_id,
      description: item.description,
      structured_formatting: item.structured_formatting,
    }));
  } catch (error) {
    if (__DEV__) console.error("Error fetching suggestions:", error);
    return [];
  }
};

export const selectPlace = async (placeId: string): Promise<Address | null> => {
  try {
    // Backend geocode endpoint returns { lat, lng, address }
    const response = await request(
      `maps/geocode?placeId=${encodeURIComponent(placeId)}`,
      { method: "GET" },
    );

    if (!response || !response.lat || !response.lng) return null;

    return {
      id: Date.now().toString(),
      label: "Other",
      address: response.address,
      coordinates: {
        lat: response.lat.toString(),
        lng: response.lng.toString(),
      },
      isDefault: false,
    };
  } catch (error) {
    if (__DEV__) console.error("Error selecting place:", error);
    return null;
  }
};

export const resolveAddressFromCoords = async (coords: {
  lat: number | string;
  lng: number | string;
}): Promise<{ address: string } | null> => {
  const lat =
    typeof coords.lat === "string" ? coords.lat : coords.lat.toString();
  const lng =
    typeof coords.lng === "string" ? coords.lng : coords.lng.toString();

  try {
    // Use backend reverse-geocode endpoint which is still available
    const response = await request(
      `maps/reverse-geocode?lat=${lat}&lng=${lng}`,
      { method: "GET" },
    );

    if (response && response.address) {
      return { address: response.address };
    }
    return null;
  } catch (error) {
    if (__DEV__) console.error("Error resolving address:", error);
    return null;
  }
};
