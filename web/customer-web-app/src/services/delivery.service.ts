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
  
  // Timestamps
  createdAt: string;
  pickedUpAt?: string;
  deliveredAt?: string;
}

export class DeliveryService {
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
  }, token?: string) {
    const response = await api.post('/trips/deliveries/request', data, getAuthHeader(token));
    return response.data;
  }

  /**
   * Save an address for the delivery
   */
  static async saveAddress(data: {
    street: string;
    city: string;
    lat: number;
    lng: number;
  }, token?: string) {
    const response = await api.post('/users/addresses', data, getAuthHeader(token));
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
    const response = await api.post(`/deliveries/${deliveryId}/rate`, { rating, comment }, getAuthHeader(token));
    return response.data;
  }

  static async pollDeliveryStatus(
    deliveryId: string, 
    targetStatus: string = 'REQUESTED',
    maxAttempts: number = 20,
    interval: number = 3000,
    token?: string
  ): Promise<boolean> {
    let attempts = 0;
    while (attempts < maxAttempts) {
      try {
        const res = await api.get(`/users/deliveries/${deliveryId}`, getAuthHeader(token));
        const currentStatus = res.data.status;
        const successStates = ['REQUESTED', 'ASSIGNED', 'FINDING_COURIER', 'PICKED_UP', 'DELIVERED', 'COMPLETED'];
        if (successStates.includes(currentStatus)) return true;
      } catch (e) {
        console.error("Polling error", e);
      }
      attempts++;
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    return false;
  }

  static async verifyPayment(reference: string, token?: string): Promise<boolean> {
    try {
      const res = await api.get(`/payment/verify?reference=${reference}`, getAuthHeader(token));
      return res.data.status === 'success' || res.data.success === true;
    } catch (error) {
      console.error("Manual verification failed", error);
      return false;
    }
  }
}