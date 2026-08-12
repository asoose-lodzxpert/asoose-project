import { ApiService } from "./api.service";
import type { BackendRide, RideStatus } from "@/types/ride-view-model";

export type { RideStatus };

export interface PriceEstimate {
  estimatedFare: number;
  distance: number;
  duration: number;
}

export interface RideLocationPayload {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RideRequestPayload {
  pickup: RideLocationPayload;
  dropoff: RideLocationPayload;
  paymentMethod: "CARD" | "WALLET";
  vehicleType: string;
  isScheduled: boolean;
  scheduledAt?: string | null;
  idempotencyKey: string;
  bookedForOther: boolean;
  passengerName: string | null;
  passengerPhone: string | null;
  passengerEmail: string | null;
}

export interface CreateRideResponse {
  ride: BackendRide;
  pickupCode?: string;
  authorizationUrl?: string;
  reference?: string;
}

export interface RideHistoryResult {
  rides: BackendRide[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export class RideService {
  static async getEstimate(
    data: {
      pickupLat?: number;
      pickupLng?: number;
      dropoffLat?: number;
      dropoffLng?: number;
      pickupAddress?: string;
      dropoffAddress?: string;
      vehicleType?: string;
    },
    token: string,
    signal?: AbortSignal,
  ): Promise<Record<string, PriceEstimate>> {
    const result = await ApiService.post<{
      distanceKm: number;
      estimatedDurationMinutes: number;
      fare: number;
    }>(
      "/rides/estimate",
      {
        pickup: {
          latitude: data.pickupLat,
          longitude: data.pickupLng,
          address: data.pickupAddress,
        },
        dropoff: {
          latitude: data.dropoffLat,
          longitude: data.dropoffLng,
          address: data.dropoffAddress,
        },
      },
      token,
      { signal },
    );

    return {
      ECONOMY: {
        estimatedFare: result.fare,
        distance: result.distanceKm,
        duration: result.estimatedDurationMinutes,
      },
    };
  }

  static createRide(data: RideRequestPayload, token: string) {
    const payload = { ...data };
    if (!payload.isScheduled) delete payload.scheduledAt;

    return ApiService.post<CreateRideResponse>("/rides", payload, token, {
      timeoutMs: 30_000,
    });
  }

  static async getCurrentRide(
    token?: string,
    signal?: AbortSignal,
  ): Promise<BackendRide | null> {
    const result = await ApiService.get<RideHistoryResult>(
      "/rides?page=1&limit=20",
      token,
      { signal },
    );
    return (
      result.rides.find(
        (ride) =>
          ![
            "COMPLETED",
            "CANCELLED",
            "CANCELLED_BY_USER",
            "CANCELLED_BY_DRIVER",
            "CANCELLED_BY_SYSTEM",
          ].includes(ride.status),
      ) ?? null
    );
  }

  static getRideById(rideId: string, token: string, signal?: AbortSignal) {
    return ApiService.get<BackendRide>(`/rides/${rideId}`, token, { signal });
  }

  static getPickupCode(rideId: string, token?: string) {
    return ApiService.get<{
      rideId: string;
      trackingId: string;
      pickupCode: string;
      codeGeneratedAt: string;
      source: string;
    }>(`/rides/${rideId}/pickup-code`, token);
  }

  static regenerateCheckout(rideId: string, token?: string) {
    return ApiService.post<{ authorizationUrl: string }>(
      `/rides/${rideId}/checkout`,
      undefined,
      token,
    );
  }

  static cancelRide(rideId: string, reason?: string, token?: string) {
    return ApiService.post<BackendRide>(
      `/rides/${rideId}/cancel`,
      { reason: reason || "Changed my mind" },
      token,
    );
  }

  static async getRideHistory(
    token: string,
    options?: { page?: number; limit?: number; status?: string },
    signal?: AbortSignal,
  ): Promise<BackendRide[]> {
    const params = new URLSearchParams({
      page: String(options?.page ?? 1),
      limit: String(options?.limit ?? 20),
    });
    const result = await ApiService.get<RideHistoryResult>(
      `/rides?${params}`,
      token,
      { signal },
    );
    return options?.status
      ? result.rides.filter((ride) => ride.status === options.status)
      : result.rides;
  }

  // The new contract does not expose these legacy live-support actions yet.
  static async getDriverLocation(
    _rideId: string,
    _token?: string,
  ): Promise<{
    latitude: number;
    longitude: number;
    heading: number;
    etaMinutes: number | null;
    distanceKm: number | null;
  } | null> {
    void _rideId;
    void _token;
    throw new Error("Live driver location is not available yet.");
  }

  static async rateDriver(
    _rideId: string,
    _rating: number,
    _comment: string,
    _token: string,
  ) {
    void _rideId;
    void _rating;
    void _comment;
    void _token;
    throw new Error("Ride rating is not available yet.");
  }

  static async confirmRide(
    rideId: string,
    _method: string,
    token: string,
    _callbackUrl?: string,
  ) {
    void _callbackUrl;
    const result = await this.regenerateCheckout(rideId, token);
    return {
      rideId,
      authorizationUrl: result.authorizationUrl,
      reference: "",
      status: undefined as string | undefined,
    };
  }
}
