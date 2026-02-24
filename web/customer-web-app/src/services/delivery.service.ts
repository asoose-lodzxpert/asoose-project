import { api } from './api';

// Helper to generate auth headers
const getAuthHeader = (token?: string) => {
  return token ? { headers: { Authorization: `Bearer ${token}` } } : {};
};

// ✅ FIX: Expanded interface to match Backend Prisma Model & UsersService response
export interface Delivery {
  id: string;
  status: 'PENDING' | 'REQUESTED' | 'ASSIGNED' | 'ACCEPTED' | 'PICKED_UP' | 'IN_TRANSIT' | 'DELIVERED' | 'CANCELLED';
  deliveryFee: number;
  distanceKm?: number;
  
  // Package Info
  packageDetails?: string;
  recipientName?: string;
  recipientPhone?: string;
  weightKg?: number;
  isFragile?: boolean;
  // ✅ NEW FIELDS MATCHING BACKEND
  isPerishable?: boolean;
  containsLiquid?: boolean;
  declaredValue?: number;
  
  // Relations
  rider?: {
    id: string;
    name: string;
    phone: string;
    vehicle?: {
      model: string;
      color: string;
      plateNumber: string;
    };
  };
  pickupAddress?: {
    street: string;
    city: string;
    state?: string;
    address?: string; // UsersService might return this composite string
  };
  dropoffAddress?: {
    street: string;
    city: string;
    state?: string;
    address?: string; // UsersService might return this composite string
  };
  
  // OTP
  deliveryOtp?: string;

  // Timestamps
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export class DeliveryService {
  /**
   * Get a fare estimate BEFORE creating the delivery.
   * Backend endpoint: POST /v1/fare/delivery
   * DeliveryFareDto uses string coordinates: pickuplat, pickuplong, dropofflat, dropofflong
   */
  static async getDeliveryFareEstimate(
    pickup: { lat: number; lng: number },
    dropoff: { lat: number; lng: number },
    token?: string
  ): Promise<{ fare: number; distance: number; duration: number }> {
    const response = await api.post('/fare/delivery', {
      pickuplat: String(pickup.lat),
      pickuplong: String(pickup.lng),
      dropofflat: String(dropoff.lat),
      dropofflong: String(dropoff.lng),
    }, getAuthHeader(token));
    return response.data;
  }

  /**
   * Create a new delivery request
   */
  static async createDelivery(data: {
    pickupAddressId: string;
    dropoffAddressId: string;
    recipientName: string;
    recipientPhone: string;
    packageDetails: string;
    weightKg: number;
    senderName?: string;
    senderPhone?: string;
    declaredValue?: number;
    fragile?: boolean;
    perishable?: boolean;
    containsLiquid?: boolean;
  }, token?: string) {
    const response = await api.post('/trips/deliveries/request', data, getAuthHeader(token));
    return response.data;
  }

  /**
   * Save an address for the delivery.
   * `label`, `street`, `lat`, and `lng` are required.
   * `city` and `state` are optional — when omitted the backend defaults to
   * 'Maiduguri' / 'Borno'. Never pass placeholder strings like 'Unknown' here;
   * they are stored verbatim and would surface as "Unknown Unknown" in the UI.
   */
  static async saveAddress(data: {
    label: string;   // REQUIRED by Prisma schema (non-nullable String)
    street: string;
    city?: string;
    state?: string;
    lat: number;
    lng: number;
  }, token?: string) {
    // city & state are @IsOptional() in the backend DTO — omit them rather than
    // sending the sentinel string 'Unknown', which would be stored verbatim in the DB
    // and cause "Unknown Unknown" to render on the Delivery Details page.
    // The backend's createAddressFromData() falls back to 'Maiduguri' / 'Borno'
    // when these fields are absent, which is a far safer default.
    const payload: Record<string, unknown> = {
      label: data.label,
      street: data.street,
      ...(data.city ? { city: data.city } : {}),
      ...(data.state ? { state: data.state } : {}),
      lat: data.lat,
      lng: data.lng,
    };
    const response = await api.post('/users/addresses', payload, getAuthHeader(token));
    return response.data;
  }

  /**
   * Get single delivery details
   * Uses /users/deliveries/:id to ensure full details + relations are returned
   */
  static async getDelivery(id: string, token?: string): Promise<Delivery> {
    const response = await api.get(`/users/deliveries/${id}`, getAuthHeader(token));
    return response.data;
  }

  static async rateDelivery(deliveryId: string, rating: number, comment?: string, token?: string) {
    // TODO: Backend does not have a delivery rating endpoint yet.
    // This is a no-op stub to prevent runtime errors until the backend implements it.
    console.warn(`rateDelivery called for ${deliveryId} but no backend endpoint exists`);
    return { success: false, message: 'Rating not yet supported' };
  }

  /**
   * Poll delivery status after payment, waiting for backend to transition from PENDING.
   * Backend DeliveryStatus enum: PENDING | REQUESTED | ASSIGNED | ACCEPTED | PICKED_UP | IN_TRANSIT | DELIVERED | CANCELLED
   */
  static async pollDeliveryStatus(
    deliveryId: string, 
    targetStatus: string = 'REQUESTED',
    maxAttempts: number = 20,
    interval: number = 3000,
    token?: string
  ): Promise<boolean> {
    let attempts = 0;
    // Only statuses that exist in the backend DeliveryStatus enum
    const paidStatuses = ['REQUESTED', 'ASSIGNED', 'ACCEPTED', 'PICKED_UP', 'IN_TRANSIT', 'DELIVERED'];
    while (attempts < maxAttempts) {
      try {
        const res = await api.get(`/users/deliveries/${deliveryId}`, getAuthHeader(token));
        const currentStatus = res.data.status;
        if (paidStatuses.includes(currentStatus)) return true;
        if (currentStatus === 'CANCELLED') return false;
      } catch (e) {
        console.error("Polling error", e);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  /**
   * Verify a payment by reference.
   * The backend's VerifyPaymentDto requires BOTH `reference` AND `gateway`.
   * The delivery flow always uses PAYSTACK; gateway is stored alongside the
   * reference in localStorage so future gateways can be supported.
   */
  static async verifyPayment(
    reference: string,
    gateway: string = 'PAYSTACK',
    token?: string,
  ): Promise<boolean> {
    try {
      const res = await api.get(
        `/payment/verify?reference=${encodeURIComponent(reference)}&gateway=${gateway}`,
        getAuthHeader(token),
      );
      return res.data.status === 'success' || res.data.success === true;
    } catch (error) {
      console.error("Manual verification failed", error);
      return false;
    }
  }
}