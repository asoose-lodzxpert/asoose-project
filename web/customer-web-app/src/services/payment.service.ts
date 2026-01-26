import { api } from './api';

export interface InitiatePaymentPayload {
  amount: number;
  email: string;
  gateway: 'PAYSTACK' | 'FLUTTERWAVE' | 'MONNIFY';
  method: 'CARD' | 'BANK_TRANSFER' | 'CASH';
  // FIX: Added 'DELIVERY' to the type definition
  type: 'ORDER' | 'RIDE' | 'DELIVERY';
  orderId?: string;
  rideId?: string;
  // FIX: Added deliveryId field
  deliveryId?: string;
  callbackUrl?: string;
  metadata?: any;
}

export interface PaymentInitResponse {
  reference: string;
  authorizationUrl: string;
  accessCode?: string;
}

export const paymentService = {
  /**
   * Initialize a payment transaction
   * @param payload Payment details
   * @param token Optional auth token to ensure authenticated request
   */
  initiatePayment: async (payload: InitiatePaymentPayload, token?: string) => {
    const config = token 
      ? { headers: { Authorization: `Bearer ${token}` } } 
      : {};

    const { data } = await api.post<PaymentInitResponse>(
      '/payment/initialize', 
      payload,
      config
    );
    return data;
  },

  /**
   * Verify a transaction
   */
  verifyPayment: async (reference: string, gateway: string) => {
    const { data } = await api.get(`/payment/verify?reference=${reference}&gateway=${gateway}`);
    return data;
  }
};