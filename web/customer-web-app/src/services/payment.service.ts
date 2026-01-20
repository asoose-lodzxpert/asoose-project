import { api } from './api';

export interface InitiatePaymentPayload {
  amount: number;
  email: string;
  gateway: 'PAYSTACK' | 'FLUTTERWAVE' | 'MONNIFY';
  method: 'CARD' | 'BANK_TRANSFER' | 'CASH';
  type: 'ORDER' | 'RIDE';
  orderId?: string;
  rideId?: string;
  callbackUrl?: string; // Optional: Used if backend allows dynamic overrides
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
   */
  initiatePayment: async (payload: InitiatePaymentPayload) => {
    const { data } = await api.post<PaymentInitResponse>('/payment/initialize', payload);
    return data;
  },

  /**
   * Verify a transaction (Optional: useful for client-side double-check)
   */
  verifyPayment: async (reference: string, gateway: string) => {
    const { data } = await api.get(`/payment/verify?reference=${reference}&gateway=${gateway}`);
    return data;
  }
};