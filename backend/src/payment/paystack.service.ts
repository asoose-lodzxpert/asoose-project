import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  PaymentGateway,
  PaymentInitResponse,
  PaymentStatus,
  VerifyPaymentResponse,
  DisbursementResponse,
  RefundResponse,
  CardAuthorization,
} from './interfaces/payment.interface';

@Injectable()
export class PaystackService {
  private readonly logger = new Logger(PaystackService.name);
  private readonly baseUrl = 'https://api.paystack.co';
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || '';
    if (!this.secretKey) {
      this.logger.warn('PAYSTACK_SECRET_KEY is not set');
    }
  }

  async initializePayment(
    amount: number,
    email: string,
    reference: string,
    metadata?: any,
    callbackUrl?: string,
  ): Promise<PaymentInitResponse> {
    try {
      const finalCallbackUrl =
        callbackUrl || `${process.env.BACKEND_URL}/payment/callback/paystack`;

      const response = await axios.post(
        `${this.baseUrl}/transaction/initialize`,
        {
          amount: amount * 100, // Convert to kobo
          email,
          reference,
          metadata,
          callback_url: finalCallbackUrl,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        reference,
        authorizationUrl: response.data.data.authorization_url,
        accessCode: response.data.data.access_code,
        amount,
      };
    } catch (error) {
      this.logger.error(
        'Paystack initialization error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initialize Paystack payment');
    }
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = response.data.data;

      // Extract card authorization if present (card payments only)
      let cardAuthorization: CardAuthorization | undefined;
      if (
        data.authorization?.authorization_code &&
        data.authorization?.reusable
      ) {
        const auth = data.authorization;
        cardAuthorization = {
          authorizationCode: auth.authorization_code,
          last4: auth.last4,
          brand: auth.brand,
          expiryMonth: auth.exp_month,
          expiryYear: auth.exp_year,
          bin: auth.bin,
          bank: auth.bank,
          cardType: auth.card_type,
          accountName: auth.account_name,
          reusable: auth.reusable,
        };
      }

      return {
        success: data.status === 'success',
        reference: data.reference,
        amount: data.amount / 100,
        status: this.mapStatus(data.status),
        gateway: PaymentGateway.PAYSTACK,
        metadata: data.metadata,
        paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
        cardAuthorization,
        customerEmail: data.customer?.email,
      };
    } catch (error) {
      this.logger.error(
        'Paystack verification error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to verify Paystack payment');
    }
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
      .update(payload)
      .digest('hex');
    return hash === signature;
  }

  async initiateTransfer(
    amount: number,
    recipientCode: string,
    reference: string,
    reason?: string,
  ): Promise<DisbursementResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfer`,
        {
          source: 'balance',
          amount: amount * 100,
          recipient: recipientCode,
          reference,
          reason: reason || 'Payment disbursement',
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: response.data.status,
        reference,
        amount,
        recipientId: recipientCode,
        gateway: PaymentGateway.PAYSTACK,
        transferCode: response.data.data.transfer_code,
        status: response.data.data.status,
      };
    } catch (error) {
      this.logger.error(
        'Paystack transfer error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initiate Paystack transfer');
    }
  }

  async createTransferRecipient(
    accountNumber: string,
    bankCode: string,
    name: string,
  ): Promise<string> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transferrecipient`,
        {
          type: 'nuban',
          name,
          account_number: accountNumber,
          bank_code: bankCode,
          currency: 'NGN',
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return response.data.data.recipient_code;
    } catch (error) {
      const paystackError = error.response?.data;
      this.logger.error(
        'Paystack recipient creation error:',
        paystackError ?? error.message,
      );
      const reason = paystackError?.message || error.message || 'Unknown error';
      throw new Error(`Failed to create transfer recipient: ${reason}`);
    }
  }

  async initiateRefund(
    reference: string,
    amount?: number,
  ): Promise<RefundResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/refund`,
        {
          transaction: reference,
          ...(amount && { amount: amount * 100 }),
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data.data;

      return {
        success: response.data.status,
        reference,
        refundReference: data.transaction.reference,
        amount: data.transaction.amount / 100,
        status: PaymentStatus.REFUNDED,
        gateway: PaymentGateway.PAYSTACK,
      };
    } catch (error) {
      this.logger.error(
        'Paystack refund error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initiate Paystack refund');
    }
  }

  private mapStatus(status: string): PaymentStatus {
    switch (status) {
      case 'success':
        return PaymentStatus.COMPLETED; // ✅ FIXED
      case 'failed':
        return PaymentStatus.FAILED;
      case 'abandoned':
        return PaymentStatus.FAILED; // ✅ FIXED: Mapped to FAILED
      default:
        return PaymentStatus.PENDING;
    }
  }
}
