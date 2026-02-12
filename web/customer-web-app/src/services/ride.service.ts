// as/customer-web-app/src/services/ride.service.ts
import { ApiService } from "./api.service";

// --- Types & Enums (Source of Truth: as/backend/prisma/schema.prisma & trip.dto.ts) ---

export type RideStatus =
  | "PENDING"
  | "REQUESTED"
  | "ACCEPTED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

/** * ✅ CORRECTED: Matches backend trip.dto.ts 
 * Previous "BIKE" | "CAR" | "VAN" was a frontend assumption.
 */
export type VehicleType = "ECONOMY" | "BUSINESS";

// Frontend View States for UI Logic
export type PageView =
  | "IDLE"
  | "PROCESSING_PAYMENT"
  | "FINDING_DRIVER"
  | "ON_WAY"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED";

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

export interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicle: {
    brand: string;
    model: string;
    plateNumber: string;
    color: string;
  };
  rating?: number;
}

export interface Ride {
  id: string;
  status: RideStatus;
  pickupAddress: {
    street: string;
    lat: number;
    lng: number;
  };
  dropoffAddress: {
    street: string;
    lat: number;
    lng: number;
  };
  rider?: Driver; // Backend refers to driver as 'rider'
  distanceKm?: number;
  totalFare?: number;
  otp?: string;
}

// --- Centralized Status Mapper ---

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

// --- Service Implementation ---

export class RideService {
  /**
   * Fetches estimates. Backend returns Record<VehicleType, PriceEstimate>
   */
  static async getEstimate(data: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
  }, token?: string): Promise<Record<VehicleType, PriceEstimate>> {
    return ApiService.post<Record<VehicleType, PriceEstimate>>("/trips/rides/estimate", data, token);
  }

  /**
   * Creates a ride request.
   */
  static async createRide(data: {
    pickupLocation: { latitude: number; longitude: number; address: string };
    dropoffLocation: { latitude: number; longitude: number; address: string };
    vehicleType: VehicleType;
    fare: number;
  }, token?: string) {
    return ApiService.post<{ ride: Ride; payment: any }>(
      "/trips/rides/request",
      data,
      token
    );
  }

  /**
   * Confirms a ride after payment method selection.
   */
  static async confirmRide(
    rideId: string,
    paymentMethod: "CASH" | "CARD",
    token?: string
  ) {
    return ApiService.post(
      `/trips/rides/${rideId}/confirm`,
      { paymentMethod },
      token
    );
  }

  /**
   * ✅ FIXED: Recovers current ride session. 
   * Maps to backend GET /trips/rides/current
   */
  static async getCurrentRide(token?: string): Promise<Ride | null> {
    return ApiService.get<Ride | null>("/trips/rides/current", token);
  }

  /**
   * Gets driver's real-time location.
   */
  static async getDriverLocation(rideId: string, token?: string) {
    return ApiService.get<{ latitude: number; longitude: number; heading: number }>(
      `/trips/rides/${rideId}/driver-location`,
      token
    );
  }

  /**
   * Cancels an active ride.
   */
  static async cancelRide(rideId: string, reason?: string, token?: string) {
    return ApiService.patch(`/trips/rides/${rideId}/cancel`, { reason }, token);
  }
}