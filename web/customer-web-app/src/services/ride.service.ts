import { ApiService } from "./api.service";
import type { BackendRide, RideStatus } from "@/types/ride-view-model";

/**
 * Re-export RideStatus for convenience
 */
export type { RideStatus };

export interface PriceEstimate {
  estimatedFare: number;
  distance: number;
  duration: number;
  total: number;
  breakdown: {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    platformFee: number;
  };
}

/**
 * Request payload for creating a ride
 */
export interface RideRequestPayload {
  pickupLocation: {
    placeId?: string;
    lat?: number;
    lng?: number;
    addressText?: string;
  };
  dropoffLocation: {
    placeId?: string;
    lat?: number;
    lng?: number;
    addressText?: string;
  };
  vehicleType: string;
  fare: number;
  distanceKm: number;
  durationMin: number;
  notes?: string;
}

/**
 * Response from create ride endpoint
 */
export interface CreateRideResponse {
  ride: BackendRide;
  fare: number;
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    gateway?: string;
  };
  message?: string;
}

/** Response shape from the /fare/ride backend endpoint */
interface FareRideResponse {
  price: number;
  distance: { meters: number; text: string };
  eta: { seconds: number; text: string };
}

/** Business-class fare multiplier applied on top of the base (economy) price */
const BUSINESS_MULTIPLIER = 1.5;

export class RideService {
  /**
   * Fetch fare estimates from /fare/ride and map into ECONOMY / BUSINESS
   * PriceEstimate records consumed by the booking UI.
   *
   * @param data - Coordinates + optional vehicleType ('ECONOMY' | 'BUSINESS')
   * @param token - Auth token
   * @param signal - AbortSignal for request cancellation
   */
  static async getEstimate(
    data: {
      pickupLat?: number;
      pickupLng?: number;
      dropoffLat?: number;
      dropoffLng?: number;
      vehicleType?: string;
    },
    token: string,
    signal?: AbortSignal,
  ): Promise<Record<string, PriceEstimate>> {
    // Transform to the backend DTO field names (all strings)
    const farePayload: Record<string, string> = {
      pickuplat: String(data.pickupLat),
      pickuplong: String(data.pickupLng),
      dropofflat: String(data.dropoffLat),
      dropofflong: String(data.dropoffLng),
    };

    // Pass vehicleType when specified so backend can apply type-specific pricing
    if (data.vehicleType) {
      farePayload.vehicleType = data.vehicleType;
    }

    const fare = await ApiService.post<FareRideResponse>(
      "/fare/ride",
      farePayload,
      token,
      { signal },
    );

    const distanceKm = fare.distance.meters / 1000;
    const durationMin = Math.round(fare.eta.seconds / 60);

    const economy: PriceEstimate = {
      estimatedFare: fare.price,
      distance: distanceKm,
      duration: durationMin,
      total: fare.price,
      breakdown: { baseFare: 0, distanceFare: 0, timeFare: 0, platformFee: 0 },
    };

    const business: PriceEstimate = {
      estimatedFare: Math.round(fare.price * BUSINESS_MULTIPLIER),
      distance: distanceKm,
      duration: durationMin,
      total: Math.round(fare.price * BUSINESS_MULTIPLIER),
      breakdown: { baseFare: 0, distanceFare: 0, timeFare: 0, platformFee: 0 },
    };

    return { ECONOMY: economy, BUSINESS: business };
  }

  static async createRide(
    data: RideRequestPayload,
    token: string,
    idempotencyKey: string,
  ): Promise<CreateRideResponse> {
    return ApiService.post<CreateRideResponse>(
      "/trips/rides/request",
      data,
      token,
      {
        headers: { "x-idempotency-key": idempotencyKey },
        // This endpoint resolves two Google Maps geocoding calls + DB writes.
        // Give it 30 s before surfacing a timeout error to the user.
        timeoutMs: 30_000,
      },
    );
  }

  static async confirmRide(
    rideId: string,
    paymentMethod: "CARD",
    token: string,
  ): Promise<{ status: string; rideId: string }> {
    return ApiService.post<{ status: string; rideId: string }>(
      `/trips/rides/${rideId}/confirm`,
      { paymentMethod },
      token,
    );
  }

  /**
   * Get current active ride for user
   * Returns raw backend ride object (use mapper to transform to ViewModel)
   */
  static async getCurrentRide(
    token?: string,
    signal?: AbortSignal,
  ): Promise<BackendRide | null> {
    return ApiService.get<BackendRide | null>("/trips/rides/current", token, {
      signal,
    });
  }

  /**
   * Get single ride by ID.
   * Returns raw backend ride object (use mapper to transform to ViewModel).
   *
   * @deprecated Not yet wired to any ride-page UI (L1). Wire to a ride-detail
   *   screen or remove in the next cleanup pass.
   * @param rideId - The ride ID
   * @param token - Auth token
   * @param signal - Abort signal for cancellation
   * @returns BackendRide from API
   * @throws Error if ride not found or auth fails
   */
  static async getRideById(
    rideId: string,
    token: string,
    signal?: AbortSignal,
  ): Promise<BackendRide> {
    if (!rideId) {
      throw new Error("Ride ID is required");
    }
    if (!token) {
      throw new Error("Authentication token is required");
    }
    return ApiService.get<BackendRide>(`/trips/rides/${rideId}`, token, {
      signal,
    });
  }

  /**
   * Fetch the list of available vehicle types from the backend.
   *
   * @deprecated Not yet wired to any UI (L1). Wire to RideSelection if a
   *   dynamic vehicle-type selector is added, or remove in the next cleanup pass.
   */
  static async getVehicleTypes(
    token: string,
    signal?: AbortSignal,
  ): Promise<string[]> {
    return ApiService.get<string[]>("/trips/vehicle-types", token, { signal });
  }

  static async cancelRide(rideId: string, reason?: string, token?: string) {
    // Deterministic idempotency key: repeated cancels of the same ride produce
    // the same key, so the backend deduplicates safely (H7 fix).
    return ApiService.patch(
      `/trips/rides/${rideId}/cancel`,
      { reason },
      token,
      {
        headers: { "x-idempotency-key": `cancel-${rideId}` },
      },
    );
  }

  static async getDriverLocation(
    rideId: string,
    token?: string,
    signal?: AbortSignal,
  ) {
    return ApiService.get<{
      latitude: number;
      longitude: number;
      heading: number;
    }>(`/trips/rides/${rideId}/driver-location`, token, { signal });
  }

  static async rateDriver(
    rideId: string,
    rating: number,
    comment: string,
    token: string,
  ) {
    return ApiService.post(
      `/trips/rides/${rideId}/rate`,
      { rating, comment },
      token,
    );
  }

  /**
   * Get user's ride history
   * Returns array of raw backend rides (use mapper to transform to ViewModels)
   *
   * @param token - Auth token
   * @param options - Query options { page?, limit?, status? }
   * @param signal - Abort signal for cancellation
   * @returns Array of BackendRide objects
   */
  static async getRideHistory(
    token: string,
    options?: { page?: number; limit?: number; status?: string },
    signal?: AbortSignal,
  ): Promise<BackendRide[]> {
    if (!token) {
      throw new Error("Authentication token is required");
    }

    // Build query string
    const params = new URLSearchParams();
    if (options?.page) params.append("page", String(options.page));
    if (options?.limit) params.append("limit", String(options.limit));
    if (options?.status) params.append("status", options.status);

    const endpoint = `/trips/rides${params.toString() ? `?${params}` : ""}`;
    return ApiService.get<BackendRide[]>(endpoint, token, { signal });
  }
}
