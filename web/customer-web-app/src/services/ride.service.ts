import { api } from './api';

// --- Interfaces ---

export interface GeoLocation {
  lat: number;
  lng: number;
  address: string;
}

export interface PriceBreakdown {
  baseFare: number;
  distanceRate: number;
  surgeMultiplier: number;
  promotionDiscount: number;
  total: number;
}

// Fixed Interface with Index Signature to allow dynamic access (e.g., priceEstimates['Standard'])
export interface PriceEstimate {
  [key: string]: PriceBreakdown | number | boolean | undefined;
  distanceKm: number;
  durationMin: number;
  isSurgeActive: boolean;
  // Optional specific keys for strict typing if needed
  Standard?: PriceBreakdown;
  Premium?: PriceBreakdown;
  XL?: PriceBreakdown;
}

export interface RideType {
  id: string;
  displayName: string;
  icon?: string;
}

export interface Driver {
  id: string;
  name: string;
  rating: number;
  trips: number;
  vehicle: string;
  plate: string;
  phone?: string;
  location?: { lat: number; lng: number };
}

export interface RideRequestPayload {
  pickup: GeoLocation;
  dropoff: GeoLocation;
  rideType: string;
  price: number;
  paymentMethodId: string;
}

export interface RideResponse {
  rideId: string;
  status: string;
  driverId?: string;
  eta?: number;
}

// --- API Methods ---

/**
 * Get price estimates. 
 * NOW ACCEPTS 'signal' for request cancellation.
 */
export const getRideEstimate = async (
  pickup: GeoLocation, 
  dropoff: GeoLocation,
  signal?: AbortSignal // <--- FIXED: Added 3rd argument
): Promise<PriceEstimate> => {
  const { data } = await api.get<PriceEstimate>('/rides/estimate', {
    params: {
      pickupLat: pickup.lat,
      pickupLng: pickup.lng,
      dropoffLat: dropoff.lat,
      dropoffLng: dropoff.lng
    },
    signal // Pass the signal to axios for cancellation
  });
  return data;
};

/**
 * Fetch available ride configuration (types) from backend.
 */
export const getRideTypes = async (): Promise<RideType[]> => {
  const { data } = await api.get<RideType[]>('/config/ride-types');
  return data;
};

/**
 * Request a new ride.
 */
export const requestRide = async (payload: RideRequestPayload): Promise<RideResponse> => {
  const { data } = await api.post<RideResponse>('/rides/request', payload);
  return data;
};

/**
 * Cancel an active ride.
 */
export const cancelRide = async (rideId: string): Promise<void> => {
  await api.post(`/rides/${rideId}/cancel`);
};

/**
 * Re-fetch state of current active ride (for page reload/reconnection).
 */
export const getCurrentRide = async (): Promise<RideResponse | null> => {
  try {
    const { data } = await api.get<RideResponse>('/rides/current');
    return data;
  } catch (error: any) {
    // If backend returns 404, it means no active ride
    if (error.response?.status === 404) return null;
    throw error;
  }
};