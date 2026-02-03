import { ApiService } from "./api.service";

// --- Type Definitions ---

export type DeliveryStatus =
  | "PENDING"
  | "REQUESTED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";

// Address Interface for UI display
export interface DeliveryAddress {
  id?: string; // Added ID
  latitude: number;
  longitude: number;
  address: string;
  recipientName?: string;
  recipientPhone?: string;
  notes?: string;
}

// Payload for saving an address to the backend
export interface CreateAddressPayload {
  street: string;
  city: string;
  state?: string;
  lat: number;
  lng: number;
  label?: string;
}

export interface AddressResponse {
  id: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
}

export interface DeliveryEstimate {
  estimatedFee: number;
  distance: number;
  duration: number;
  breakdown: {
    baseFee: number;
    distanceFee: number;
    weightFee: number;
    platformFee: number;
  };
}

export interface Rider {
  id: string;
  name: string;
  phone: string;
  image?: string;
  rating: number;
  vehicleNumber: string;
  location?: {
    latitude: number;
    longitude: number;
  };
}

export interface Delivery {
  id: string;
  status: DeliveryStatus;
  customerId: string;
  riderId?: string;
  rider?: Rider;
  pickupAddress: DeliveryAddress;
  dropoffAddress: DeliveryAddress;
  packageDetails: string; // Backend sends this as string
  deliveryFee: number;
  actualFee?: number;
  distance: number; // mapped from distanceKm usually
  duration: number;
  pickupOtp?: string;
  deliveryOtp?: string;
  paymentId?: string;
  paymentStatus?: string;
  scheduledTime?: string;
  orderId?: string;
  createdAt: string;
  updatedAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

// Backend DTO for Request
export interface CreateDeliveryRequest {
  pickupAddressId: string;
  dropoffAddressId: string;
  recipientName: string;
  recipientPhone: string;
  packageDetails: string;
  weightKg: number;
  orderId?: string;
}

// Response from /trips/deliveries/request
export interface DeliveryRequestResponse {
  delivery: Delivery;
  deliveryFee: number;
  distance: number;
  message: string;
}

// --- API Service Methods ---

export class DeliveryService {
  /**
   * 1. Save Address
   * Persist coordinates to backend to get an Address ID.
   * Required before creating a delivery.
   */
  static async saveAddress(
    data: CreateAddressPayload
  ): Promise<AddressResponse> {
    return ApiService.post<AddressResponse>("/users/addresses", data);
  }

  /**
   * 2. Create Delivery Request
   * Creates a delivery in PENDING state and calculates the fee.
   * Uses /trips/deliveries/request
   */
  static async createDelivery(
    data: CreateDeliveryRequest
  ): Promise<DeliveryRequestResponse> {
    return ApiService.post<DeliveryRequestResponse>(
      "/trips/deliveries/request",
      data
    );
  }

  /**
   * Get delivery fee estimate (Optional/Legacy)
   * Note: The createDelivery response also returns the calculated fee.
   */
  static async getEstimate(data: {
    pickupLat: number;
    pickupLng: number;
    dropoffLat: number;
    dropoffLng: number;
    weight?: number;
    fragile?: boolean;
  }): Promise<DeliveryEstimate> {
    return ApiService.post<DeliveryEstimate>("/deliveries/estimate", data);
  }

  /**
   * Get all user deliveries
   * Updated to use TripsController endpoint
   */
  static async getDeliveries(status?: DeliveryStatus): Promise<Delivery[]> {
    const query = status ? `?status=${status}` : "";
    return ApiService.get<Delivery[]>(`/trips/deliveries${query}`);
  }

  /**
   * Get specific delivery details
   * Updated to use TripsController endpoint
   */
  static async getDelivery(deliveryId: string): Promise<Delivery> {
    return ApiService.get<Delivery>(`/trips/deliveries/${deliveryId}`);
  }

  /**
   * Cancel a delivery
   * Updated to use TripsController endpoint
   */
  static async cancelDelivery(
    deliveryId: string,
    reason?: string
  ): Promise<{ message: string }> {
    return ApiService.patch<{ message: string }>(
      `/trips/deliveries/${deliveryId}/cancel`,
      { reason }
    );
  }

  /**
   * Poll for delivery status change (e.g., waiting for Payment -> Requested)
   */
  static async pollDeliveryStatus(
    deliveryId: string,
    targetStatus: DeliveryStatus = "REQUESTED",
    maxAttempts: number = 20,
    intervalMs: number = 3000
  ): Promise<boolean> {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const data = await this.getDelivery(deliveryId);
        // Check if we reached target status or advanced past it (e.g. ASSIGNED)
        if (
          data.status === targetStatus ||
          data.status === "ASSIGNED" ||
          data.status === "PICKED_UP"
        ) {
          return true;
        }
        if (data.status === "CANCELLED") {
          throw new Error("Delivery was cancelled");
        }
      } catch (e) {
        console.warn("Polling error:", e);
      }

      await new Promise((resolve) => setTimeout(resolve, intervalMs));
      attempts++;
    }
    return false;
  }

  // --- Interaction Methods ---

  /**
   * Verify pickup OTP (when rider picks up package)
   */
  static async verifyPickupOtp(
    deliveryId: string,
    otp: string
  ): Promise<{ message: string; delivery: Delivery }> {
    return ApiService.post<{ message: string; delivery: Delivery }>(
      `/users/deliveries/${deliveryId}/verify-pickup`, // Note: Check if backend moved this to Trips
      { otp }
    );
  }

  /**
   * Verify delivery OTP (when package is delivered)
   */
  static async verifyDeliveryOtp(
    deliveryId: string,
    otp: string
  ): Promise<{ message: string; delivery: Delivery }> {
    return ApiService.post<{ message: string; delivery: Delivery }>(
      `/users/deliveries/${deliveryId}/verify-delivery`, // Note: Check if backend moved this to Trips
      { otp }
    );
  }

  /**
   * Rate rider after delivery completion
   */
  static async rateDelivery(
    deliveryId: string,
    rating: number,
    comment?: string
  ): Promise<{ message: string }> {
    return ApiService.post<{ message: string }>(
      `/users/deliveries/${deliveryId}/rate`,
      {
        rating,
        comment,
      }
    );
  }

  /**
   * Get rider's current location during active delivery
   */
  static async getRiderLocation(deliveryId: string): Promise<{
    latitude: number;
    longitude: number;
    heading?: number;
  }> {
    return ApiService.get<{
      latitude: number;
      longitude: number;
      heading?: number;
    }>(`/users/deliveries/${deliveryId}/rider-location`);
  }

  /**
   * Track delivery in real-time
   */
  static async trackDelivery(trackingCode: string): Promise<Delivery> {
    return ApiService.get<Delivery>(`/deliveries/track/${trackingCode}`);
  }
}