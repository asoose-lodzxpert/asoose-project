import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  PaymentInitResponse,
  PaymentStatus,
  VerifyPaymentResponse,
  PaymentGateway,
  DisbursementResponse,
  RefundResponse,
} from './interfaces/payment.interface';

@Injectable()
export class FlutterwaveService {
  private readonly logger = new Logger(FlutterwaveService.name);
  private readonly baseUrl = 'https://api.flutterwave.com/v3';
  private readonly secretKey: string;

  constructor() {
    this.secretKey = process.env.FLUTTERWAVE_SECRET_KEY || '';
    if (!this.secretKey) {
      throw new Error(
        'FLUTTERWAVE_SECRET_KEY is not defined in environment variables',
      );
    }
  }

  async initializePayment(
    amount: number,
    email: string,
    reference: string,
    customerName: string,
    phoneNumber?: string,
    metadata?: any,
  ): Promise<PaymentInitResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/payments`,
        {
          tx_ref: reference,
          amount,
          currency: 'NGN',
          redirect_url: `${process.env.BACKEND_URL}/payment/webhook/flutterwave/callback`,
          customer: {
            email,
            name: customerName,
            phonenumber: phoneNumber,
          },
          customizations: {
            title: 'ASOOSE Payment',
            description: 'Payment for order',
            logo: 'https://your-logo-url.com/logo.png',
          },
          meta: metadata,
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
        authorizationUrl: response.data.data.link,
        amount,
      };
    } catch (error) {
      this.logger.error(
        'Flutterwave initialization error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initialize Flutterwave payment');
    }
  }

  async verifyPayment(transactionId: string): Promise<VerifyPaymentResponse> {
    try {
      const response = await axios.get(
        `${this.baseUrl}/transactions/${transactionId}/verify`,
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
          },
        },
      );

      const data = response.data.data;

      return {
        success: data.status === 'successful',
        reference: data.tx_ref,
        amount: data.amount,
        status: this.mapStatus(data.status),
        gateway: PaymentGateway.FLUTTERWAVE,
        metadata: data.meta,
        paidAt: data.created_at ? new Date(data.created_at) : undefined,
      };
    } catch (error) {
      this.logger.error(
        'Flutterwave verification error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to verify Flutterwave payment');
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha256', this.secretKey)
      .update(JSON.stringify(payload))
      .digest('hex');
    return hash === signature;
  }

  async initiateTransfer(
    amount: number,
    accountNumber: string,
    bankCode: string,
    accountName: string,
    reference: string,
    narration?: string,
  ): Promise<DisbursementResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transfers`,
        {
          account_bank: bankCode,
          account_number: accountNumber,
          amount,
          currency: 'NGN',
          reference,
          narration: narration || 'Payment disbursement',
          beneficiary_name: accountName,
        },
        {
          headers: {
            Authorization: `Bearer ${this.secretKey}`,
            'Content-Type': 'application/json',
          },
        },
      );

      return {
        success: response.data.status === 'success',
        reference,
        amount,
        recipientId: accountNumber,
        gateway: PaymentGateway.FLUTTERWAVE,
        transferCode: response.data.data.id,
        status: response.data.data.status,
      };
    } catch (error) {
      this.logger.error(
        'Flutterwave transfer error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initiate Flutterwave transfer');
    }
  }

  async initiateRefund(
    transactionId: string,
    amount?: number,
  ): Promise<RefundResponse> {
    try {
      const response = await axios.post(
        `${this.baseUrl}/transactions/${transactionId}/refund`,
        {
          ...(amount && { amount }),
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
        success: response.data.status === 'success',
        reference: transactionId,
        refundReference: data.id,
        amount: data.amount_refunded,
        status: PaymentStatus.REFUNDED,
        gateway: PaymentGateway.FLUTTERWAVE,
      };
    } catch (error) {
      this.logger.error(
        'Flutterwave refund error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initiate Flutterwave refund');
    }
  }

  private mapStatus(status: string): PaymentStatus {
    switch (status) {
      case 'successful':
        return PaymentStatus.SUCCESS;
      case 'failed':
        return PaymentStatus.FAILED;
      case 'cancelled':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
