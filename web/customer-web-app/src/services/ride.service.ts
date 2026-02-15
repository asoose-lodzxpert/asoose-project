import { ApiService } from "./api.service";

export type RideStatus = "PENDING" | "REQUESTED" | "ACCEPTED" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
export type PageView = "IDLE" | "PROCESSING_PAYMENT" | "FINDING_DRIVER" | "ON_WAY" | "ARRIVED" | "IN_PROGRESS" | "COMPLETED";

export interface PriceEstimate {
  estimatedFare: number;
  distance: number;
  duration: number;
  total: number;
  breakdown: { baseFare: number; distanceFare: number; timeFare: number; platformFee: number; };
}

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle?: { brand: string; model: string; plateNumber: string; color: string; };
  vehicleNumber?: string; 
  rating?: number;
  etaMinutes?: number;
  image?: string; 
  location?: { latitude: number; longitude: number; heading?: number; }; 
}

export interface LocationPayloadDto {
  addressText?: string; 
  placeId?: string;
  lat?: number;
  lng?: number;
}

export interface Ride {
  id: string;
  status: RideStatus;
  pickupAddress: LocationPayloadDto;
  dropoffAddress: LocationPayloadDto;
  driver?: Driver; // Renamed from rider -> driver
  distanceKm?: number;
  totalFare?: number;
  estimatedFare?: number;
  actualFare?: number;
  paymentStatus?: string;
  startOtp?: string;
  otp?: string;
}

export interface RideRequestPayload {
  pickupLocation: LocationPayloadDto;
  dropoffLocation: LocationPayloadDto;
  vehicleType: string;
  paymentMethodId: string;
}

export interface CreateRideResponse {
  ride: Ride;
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

export const mapStatusToView = (status: RideStatus): PageView => {
  const mapping: Record<RideStatus, PageView> = {
    PENDING: "PROCESSING_PAYMENT", 
    REQUESTED: "FINDING_DRIVER",
    ACCEPTED: "ON_WAY",
    ARRIVED: "ARRIVED",
    IN_PROGRESS: "IN_PROGRESS",
    COMPLETED: "COMPLETED",
    CANCELLED: "IDLE",
  };
  return mapping[status] || "IDLE";
};

export class RideService {
  static async getEstimate(data: {
    pickupPlaceId?: string; pickupLat?: number; pickupLng?: number;
    dropoffPlaceId?: string; dropoffLat?: number; dropoffLng?: number;
  }, token: string, signal?: AbortSignal): Promise<Record<string, PriceEstimate>> {
    return ApiService.post<Record<string, PriceEstimate>>("/trips/rides/estimate", data, token, { signal });
  }

  static async createRide(data: RideRequestPayload, token: string, idempotencyKey: string): Promise<CreateRideResponse> {
    return ApiService.post<CreateRideResponse>("/trips/rides/request", data, token, {
      headers: { 'x-idempotency-key': idempotencyKey }
    });
  }

  static async confirmRide(rideId: string, paymentMethod: "CASH" | "CARD", token: string) {
    return ApiService.post(`/trips/rides/${rideId}/confirm`, { paymentMethod }, token);
  }

  static async getCurrentRide(token?: string, signal?: AbortSignal): Promise<Ride | null> {
    return ApiService.get<Ride | null>("/trips/rides/current", token, { signal });
  }

  static async getVehicleTypes(token: string, signal?: AbortSignal): Promise<string[]> {
    return ApiService.get<string[]>("/trips/vehicle-types", token, { signal });
  }

  static async cancelRide(rideId: string, reason?: string, token?: string) {
    return ApiService.patch(`/trips/rides/${rideId}/cancel`, { reason }, token);
  }

  static async getDriverLocation(rideId: string, token?: string, signal?: AbortSignal) {
    return ApiService.get<{ latitude: number; longitude: number; heading: number }>(
      `/trips/rides/${rideId}/driver-location`,
      token,
      { signal }
    );
  }
}