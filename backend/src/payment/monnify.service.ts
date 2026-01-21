import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import {
  PaymentInitResponse,
  PaymentStatus,
  VerifyPaymentResponse,
  PaymentGateway,
  DisbursementResponse,
} from './interfaces/payment.interface';

@Injectable()
export class MonnifyService {
  private readonly logger = new Logger(MonnifyService.name);
  private readonly baseUrl: string;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private readonly contractCode: string;
  private accessToken: string;
  private tokenExpiry: Date;

  constructor() {
    this.baseUrl =
      process.env.MONNIFY_BASE_URL || 'https://sandbox.monnify.com';
    this.apiKey = process.env.MONNIFY_API_KEY || '';
    this.secretKey = process.env.MONNIFY_SECRET_KEY || '';
    this.contractCode = process.env.MONNIFY_CONTRACT_CODE || '';
  }

  private async getAccessToken(): Promise<string> {
    // Return cached token if still valid
    if (this.accessToken && this.tokenExpiry && new Date() < this.tokenExpiry) {
      return this.accessToken;
    }

    try {
      const credentials = Buffer.from(
        `${this.apiKey}:${this.secretKey}`,
      ).toString('base64');

      const response = await axios.post(
        `${this.baseUrl}/api/v1/auth/login`,
        {},
        {
          headers: {
            Authorization: `Basic ${credentials}`,
          },
        },
      );

      this.accessToken = response.data.responseBody.accessToken;
      // Set expiry to 1 hour from now (Monnify tokens typically last 1 hour)
      this.tokenExpiry = new Date(Date.now() + 3600000);

      return this.accessToken;
    } catch (error) {
      this.logger.error(
        'Monnify authentication error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to authenticate with Monnify');
    }
  }

  async initializeBankTransfer(
    amount: number,
    email: string,
    reference: string,
    customerName: string,
    metadata?: any,
  ): Promise<PaymentInitResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/api/v1/merchant/transactions/init-transaction`,
        {
          amount,
          customerName,
          customerEmail: email,
          paymentReference: reference,
          paymentDescription: 'Order Payment',
          currencyCode: 'NGN',
          contractCode: this.contractCode,
          redirectUrl: `${process.env.BACKEND_URL}/payment/webhook/monnify/callback`,
          paymentMethods: ['ACCOUNT_TRANSFER'],
          metadata,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data.responseBody;

      return {
        reference,
        accountNumber: data.accountNumber,
        bankName: data.bankName,
        accountName: data.accountName,
        amount,
        expiresAt: new Date(data.expiryDateTime),
      };
    } catch (error) {
      this.logger.error(
        'Monnify initialization error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initialize Monnify payment');
    }
  }

  async verifyPayment(reference: string): Promise<VerifyPaymentResponse> {
    try {
      const token = await this.getAccessToken();

      const response = await axios.get(
        `${this.baseUrl}/api/v2/merchant/transactions/query`,
        {
          params: { paymentReference: reference },
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = response.data.responseBody;

      return {
        success: data.paymentStatus === 'PAID',
        reference: data.paymentReference,
        amount: data.amountPaid,
        status: this.mapStatus(data.paymentStatus),
        gateway: PaymentGateway.MONNIFY,
        metadata: data.metaData,
        paidAt: data.paidOn ? new Date(data.paidOn) : undefined,
      };
    } catch (error) {
      this.logger.error(
        'Monnify verification error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to verify Monnify payment');
    }
  }

  verifyWebhookSignature(payload: any, signature: string): boolean {
    const crypto = require('crypto');
    const hash = crypto
      .createHmac('sha512', this.secretKey)
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
      const token = await this.getAccessToken();

      const response = await axios.post(
        `${this.baseUrl}/api/v2/disbursements/single`,
        {
          amount,
          reference,
          narration: narration || 'Payment disbursement',
          destinationBankCode: bankCode,
          destinationAccountNumber: accountNumber,
          currency: 'NGN',
          sourceAccountNumber: this.contractCode, // Use contract code as source
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        },
      );

      const data = response.data.responseBody;

      return {
        success: data.status === 'SUCCESS',
        reference,
        amount,
        recipientId: accountNumber,
        gateway: PaymentGateway.MONNIFY,
        transferCode: data.reference,
        status: data.status,
      };
    } catch (error) {
      this.logger.error(
        'Monnify transfer error:',
        error.response?.data || error.message,
      );
      throw new Error('Failed to initiate Monnify transfer');
    }
  }

  private mapStatus(status: string): PaymentStatus {
    switch (status) {
      case 'PAID':
        return PaymentStatus.SUCCESS;
      case 'FAILED':
        return PaymentStatus.FAILED;
      case 'CANCELLED':
      case 'EXPIRED':
        return PaymentStatus.CANCELLED;
      default:
        return PaymentStatus.PENDING;
    }
  }
}
