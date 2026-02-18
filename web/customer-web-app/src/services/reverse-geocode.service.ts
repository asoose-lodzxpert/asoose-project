/**
 * Reverse Geocoding Service
 * Converts coordinates to human-readable addresses
 * Uses Google Maps Geocoding API
 */

export interface ReverseGeocodeResult {
  address: string;
  city: string;
  state: string;
  country: string;
  placeId?: string;
}

export interface ReverseGeocodeError {
  code: 'API_ERROR' | 'INVALID_COORDS' | 'NO_RESULTS' | 'NETWORK_ERROR' | 'UNKNOWN';
  message: string;
  details?: string;
}

/**
 * Reverse geocode coordinates to address
 * 
 * @param lat - Latitude
 * @param lng - Longitude
 * @returns Formatted address components
 * @throws ReverseGeocodeError
 */
export async function reverseGeocode(
  lat: number,
  lng: number
): Promise<ReverseGeocodeResult> {
  // Validate coordinates
  if (!isValidCoordinate(lat, lng)) {
    throw {
      code: 'INVALID_COORDS',
      message: 'Invalid coordinates provided',
      details: 'Latitude must be between -90 and 90, longitude between -180 and 180',
    } as ReverseGeocodeError;
  }

  try {
    // Use Google Maps Geocoding API
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw {
        code: 'API_ERROR',
        message: 'Maps service not configured',
        details: 'Please contact support',
      } as ReverseGeocodeError;
    }

    const response = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${apiKey}`,
      {
        signal: AbortSignal.timeout(5000), // 5 second timeout
      }
    );

    if (!response.ok) {
      throw {
        code: 'NETWORK_ERROR',
        message: 'Failed to fetch address',
        details: 'Please try again',
      } as ReverseGeocodeError;
    }

    const data = await response.json();

    // Check API status
    if (data.status === 'ZERO_RESULTS') {
      throw {
        code: 'NO_RESULTS',
        message: 'No address found for this location',
        details: 'Please try a different location or enter address manually',
      } as ReverseGeocodeError;
    }

    if (data.status !== 'OK') {
      throw {
        code: 'API_ERROR',
        message: 'Geocoding service error',
        details: 'Please try again',
      } as ReverseGeocodeError;
    }

    if (!data.results || data.results.length === 0) {
      throw {
        code: 'NO_RESULTS',
        message: 'No address found',
        details: 'Please enter location manually',
      } as ReverseGeocodeError;
    }

    // Parse first result
    const result = data.results[0];
    const addressComponents = result.address_components || [];

    // Extract components
    const streetNumber = findComponent(addressComponents, 'street_number')?.short_name || '';
    const route = findComponent(addressComponents, 'route')?.short_name || '';
    const city = findComponent(addressComponents, 'locality')?.short_name || '';
    const state = findComponent(addressComponents, 'administrative_area_level_1')?.short_name || '';
    const country = findComponent(addressComponents, 'country')?.short_name || '';

    // Build address string
    const addressParts = [];
    if (streetNumber) addressParts.push(streetNumber);
    if (route) addressParts.push(route);

    const address = addressParts.length > 0 
      ? addressParts.join(' ')
      : result.formatted_address || 'Location';

    return {
      address,
      city: city || 'Unknown',
      state: state || 'Unknown',
      country: country || 'Unknown',
      placeId: result.place_id,
    };
  } catch (error) {
    // Handle AbortError (timeout)
    if (error instanceof Error && error.name === 'AbortError') {
      throw {
        code: 'NETWORK_ERROR',
        message: 'Request timed out',
        details: 'Please try again',
      } as ReverseGeocodeError;
    }

    // Re-throw if already a ReverseGeocodeError
    if ((error as any).code) {
      throw error;
    }

    // Generic error
    throw {
      code: 'UNKNOWN',
      message: 'Failed to get address',
      details: error instanceof Error ? error.message : 'Please try again',
    } as ReverseGeocodeError;
  }
}

/**
 * Helper: Check if coordinates are valid
 */
function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180 &&
    !isNaN(lat) &&
    !isNaN(lng)
  );
}

/**
 * Helper: Find component by type in address components
 */
function findComponent(
  components: any[],
  type: string
): { short_name: string; long_name: string } | undefined {
  return components.find((comp) => comp.types.includes(type));
}

/**
 * Format error for display to users
 */
export function formatGeocodeError(error: ReverseGeocodeError): string {
  return error.details || error.message;
}
