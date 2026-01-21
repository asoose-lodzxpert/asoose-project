import { ApiService } from "./api.service";

// --- Type Definitions ---
export type RideStatus =
  | "PENDING"
  | "REQUESTED"
  | "ACCEPTED"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "CANCELLED";
export type VehicleType = "BIKE" | "CAR" | "VAN";

export interface GeoLocation {
  latitude: number;
  longitude: number;
  address: string;
}

export interface RideEstimate {
  estimatedFare: number;
  distance: number;
  duration: number;
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
  image?: string;
  rating: number;
  vehicleNumber: string;
  vehicleModel?: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Ride {
  id: string;
  status: RideStatus;
  customerId: string;
  driverId?: string;
  driver?: Driver;
  pickupLocation: GeoLocation;
  dropoffLocation: GeoLocation;
  vehicleType: VehicleType;
  estimatedFare: number;
  actualFare?: number;
  distance: number;
  duration: number;
  pickupOtp?: string;
  paymentId?: string;
  paymentStatus?: string;
  scheduledTime?: string;
  notes?: string;
  cancelReason?: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}

export interface CreateRideRequest {
  pickupLocation: GeoLocation;
  dropoffLocation: GeoLocation;
  vehicleType: VehicleType;
  scheduledTime?: string;
  notes?: string;
}

export interface RidePaymentResponse {
  ride: Ride;
  payment: {
    id: string;
    amount: number;
    status: string;
    reference: string;
    authorizationUrl?: string;
  };
}

// --- API Service Methods ---

export class RideService {
  /**
   * Get fare estimate for a ride
   */
  static async getEstimate(data: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    vehicleType: VehicleType;
  }): Promise<RideEstimate> {
    return ApiService.post<RideEstimate>("/rides/estimate", data);
  }

  /**
   * Create a new ride request with payment
   */
  static async createRide(
    data: CreateRideRequest,
  ): Promise<RidePaymentResponse> {
    return ApiService.post<RidePaymentResponse>("/users/rides", data);
  }

  /**
   * Get all user rides
   */
  static async getRides(status?: RideStatus): Promise<Ride[]> {
    const query = status ? `?status=${status}` : "";
    return ApiService.get<Ride[]>(`/users/rides${query}`);
  }

  /**
   * Get specific ride details
   */
  static async getRide(rideId: string): Promise<Ride> {
    return ApiService.get<Ride>(`/users/rides/${rideId}`);
  }

  /**
   * Get current active ride
   */
  static async getCurrentRide(): Promise<Ride | null> {
    try {
      return await ApiService.get<Ride>("/users/rides/current");
    } catch (error: any) {
      if (error.message.includes("404")) return null;
      throw error;
    }
  }

  /**
   * Cancel a ride
   */
  static async cancelRide(
    rideId: string,
    reason?: string,
  ): Promise<{ message: string; refund?: any }> {
    return ApiService.post<{ message: string; refund?: any }>(
      `/users/rides/${rideId}/cancel`,
      { reason },
    );
  }

  /**
   * Verify pickup OTP (when driver picks up customer)
   */
  static async verifyPickupOtp(
    rideId: string,
    otp: string,
  ): Promise<{ message: string; ride: Ride }> {
    return ApiService.post<{ message: string; ride: Ride }>(
      `/users/rides/${rideId}/verify-pickup`,
      { otp },
    );
  }

  /**
   * Rate driver after ride completion
   */
  static async rateRide(
    rideId: string,
    rating: number,
    comment?: string,
  ): Promise<{ message: string }> {
    return ApiService.post<{ message: string }>(`/users/rides/${rideId}/rate`, {
      rating,
      comment,
    });
  }

  /**
   * Get driver's current location during active ride
   */
  static async getDriverLocation(rideId: string): Promise<{
    latitude: number;
    longitude: number;
    heading?: number;
  }> {
    return ApiService.get<{
      latitude: number;
      longitude: number;
      heading?: number;
    }>(`/users/rides/${rideId}/driver-location`);
  }

  /**
   * Get ride history with pagination
   */
  static async getRideHistory(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    rides: Ride[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return ApiService.get<{
      rides: Ride[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/users/rides/history?page=${page}&limit=${limit}`);
  }
}
