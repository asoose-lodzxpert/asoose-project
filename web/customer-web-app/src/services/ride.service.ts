import { ApiService } from "./api.service";

export type RideStatus =
  | "PENDING"
  | "REQUESTED"
  | "ACCEPTED"
  | "ARRIVED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";

export type VehicleType = "BIKE" | "CAR" | "VAN";

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
  etaMinutes?: number; // <--- FIX: Added this field
}

export interface Ride {
  id: string;
  status: RideStatus;
  pickupAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  dropoffAddress: {
    address: string;
    latitude: number;
    longitude: number;
  };
  driver?: Driver;
  distanceKm?: number;
  totalFare?: number;
  otp?: string;
}

export class RideService {
  static async getEstimate(data: any, token?: string) {
    return ApiService.post("/trips/rides/estimate", data, token);
  }

  static async createRide(data: any, token?: string) {
    return ApiService.post<{ ride: Ride; payment: any }>(
      "/trips/rides/request",
      data,
      token,
    );
  }

  static async confirmRide(
    rideId: string,
    paymentMethod: string,
    token?: string,
  ) {
    return ApiService.post(
      `/trips/rides/${rideId}/confirm`,
      { paymentMethod },
      token,
    );
  }

  static async getCurrentRide(token?: string) {
    return ApiService.get<Ride | null>("/trips/rides/current", token);
  }

  static async getDriverLocation(rideId: string, token?: string) {
    return ApiService.get<{ latitude: number; longitude: number }>(
      `/trips/rides/${rideId}/driver-location`,
      token,
    );
  }

  static async cancelRide(rideId: string, reason?: string, token?: string) {
    return ApiService.patch(`/trips/rides/${rideId}/cancel`, { reason }, token);
  }
}
