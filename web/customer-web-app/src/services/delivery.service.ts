import { ApiService } from "./api.service";

// --- Type Definitions ---
export type DeliveryStatus =
  | "PENDING"
  | "REQUESTED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "DELIVERED"
  | "CANCELLED";

export interface DeliveryAddress {
  latitude: number;
  longitude: number;
  address: string;
  recipientName: string;
  recipientPhone: string;
  notes?: string;
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
  packageDetails: {
    description: string;
    weight?: number;
    value?: number;
    fragile?: boolean;
  };
  deliveryFee: number;
  actualFee?: number;
  distance: number;
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

export interface CreateDeliveryRequest {
  pickupAddress: DeliveryAddress;
  dropoffAddress: DeliveryAddress;
  packageDetails: {
    description: string;
    weight?: number;
    value?: number;
    fragile?: boolean;
  };
  scheduledTime?: string;
}

export interface DeliveryPaymentResponse {
  delivery: Delivery;
  payment: {
    id: string;
    amount: number;
    status: string;
    reference: string;
    authorizationUrl?: string;
  };
}

// --- API Service Methods ---

export class DeliveryService {
  /**
   * Get delivery fee estimate
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
   * Create a new delivery request with payment
   */
  static async createDelivery(
    data: CreateDeliveryRequest,
  ): Promise<DeliveryPaymentResponse> {
    return ApiService.post<DeliveryPaymentResponse>("/users/deliveries", data);
  }

  /**
   * Get all user deliveries
   */
  static async getDeliveries(status?: DeliveryStatus): Promise<Delivery[]> {
    const query = status ? `?status=${status}` : "";
    return ApiService.get<Delivery[]>(`/users/deliveries${query}`);
  }

  /**
   * Get specific delivery details
   */
  static async getDelivery(deliveryId: string): Promise<Delivery> {
    return ApiService.get<Delivery>(`/users/deliveries/${deliveryId}`);
  }

  /**
   * Get current active delivery
   */
  static async getCurrentDelivery(): Promise<Delivery | null> {
    try {
      return await ApiService.get<Delivery>("/users/deliveries/current");
    } catch (error: any) {
      if (error.message.includes("404")) return null;
      throw error;
    }
  }

  /**
   * Cancel a delivery
   */
  static async cancelDelivery(
    deliveryId: string,
    reason?: string,
  ): Promise<{ message: string; refund?: any }> {
    return ApiService.post<{ message: string; refund?: any }>(
      `/users/deliveries/${deliveryId}/cancel`,
      { reason },
    );
  }

  /**
   * Verify pickup OTP (when rider picks up package)
   */
  static async verifyPickupOtp(
    deliveryId: string,
    otp: string,
  ): Promise<{ message: string; delivery: Delivery }> {
    return ApiService.post<{ message: string; delivery: Delivery }>(
      `/users/deliveries/${deliveryId}/verify-pickup`,
      { otp },
    );
  }

  /**
   * Verify delivery OTP (when package is delivered)
   */
  static async verifyDeliveryOtp(
    deliveryId: string,
    otp: string,
  ): Promise<{ message: string; delivery: Delivery }> {
    return ApiService.post<{ message: string; delivery: Delivery }>(
      `/users/deliveries/${deliveryId}/verify-delivery`,
      { otp },
    );
  }

  /**
   * Rate rider after delivery completion
   */
  static async rateDelivery(
    deliveryId: string,
    rating: number,
    comment?: string,
  ): Promise<{ message: string }> {
    return ApiService.post<{ message: string }>(
      `/users/deliveries/${deliveryId}/rate`,
      {
        rating,
        comment,
      },
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
   * Get delivery history with pagination
   */
  static async getDeliveryHistory(
    page: number = 1,
    limit: number = 20,
  ): Promise<{
    deliveries: Delivery[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    return ApiService.get<{
      deliveries: Delivery[];
      total: number;
      page: number;
      totalPages: number;
    }>(`/users/deliveries/history?page=${page}&limit=${limit}`);
  }

  /**
   * Track delivery in real-time
   */
  static async trackDelivery(trackingCode: string): Promise<Delivery> {
    return ApiService.get<Delivery>(`/deliveries/track/${trackingCode}`);
  }
}
