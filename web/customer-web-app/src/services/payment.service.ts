import { ApiService } from "./api.service";

export interface InitiatePaymentPayload {
  amount: number;
  email: string;
  gateway: "PAYSTACK" | "FLUTTERWAVE" | "MONNIFY";
  method: "CARD" | "BANK_TRANSFER";
  type: "ORDER" | "RIDE" | "DELIVERY";
  orderId?: string;
  orderGroupId?: string; // FIX: Added OrderGroup support
  rideId?: string;
  deliveryId?: string;
  callbackUrl?: string;
  metadata?: any;
  state?: string;
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
    return ApiService.post<PaymentInitResponse>(
      "/payment/initialize",
      payload,
      token,
    );
  },

  /**
   * Verify a transaction
   */
  verifyPayment: async (reference: string, gateway: string) => {
    return ApiService.get(
      `/payment/verify?reference=${reference}&gateway=${gateway}`,
    );
  },
};
