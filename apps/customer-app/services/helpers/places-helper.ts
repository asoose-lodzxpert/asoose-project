import { Address } from "@/types/address";
import { request } from "@/lib/authFetch";

export const fetchSuggestions = async (input: string): Promise<any[]> => {
  if (!input) return [];
  try {
    // Backend expects 'query' parameter, returns array of { id, title, subtitle }
    const response = await request(
      `maps/places-autocomplete?query=${encodeURIComponent(input)}`,
      { method: "GET" },
    );
    // Transform backend response to match expected format
    return response.map((item: any) => ({
      place_id: item.id,
      description: `${item.title}, ${item.subtitle}`,
      structured_formatting: {
        main_text: item.title,
        secondary_text: item.subtitle,
      },
    }));
  } catch (error) {
    console.error("Error fetching suggestions:", error);
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
    console.error("Error selecting place:", error);
    return null;
  }
};

/**
 * Resolves a full address from latitude and longitude using backend Maps API.
 * Uses the geocode endpoint with coordinates.
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

  try {
    // Use address-search endpoint which accepts latitude and longitude
    const response = await request(
      `maps/address-search?query=${lat},${lng}&latitude=${lat}&longitude=${lng}`,
      { method: "GET" },
    );

    // If we get results, use the first one
    if (response && response.length > 0) {
      return { address: `${response[0].title}, ${response[0].subtitle}` };
    }
    return null;
  } catch (error) {
    console.error("Error resolving address:", error);
    return null;
  }
};
