import type {
  PaymentGateway,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
  PaymentType,
  RecipientType,
} from '../enums/payment.enums';

export {
  PaymentGateway,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
  PaymentType,
  RecipientType,
} from '../enums/payment.enums';

export interface PaymentInitResponse {
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  transactionId?: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  amount: number;
  expiresAt?: Date;
}

export interface CardAuthorization {
  authorizationCode: string;
  last4: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
  bin?: string;
  bank?: string;
  cardType?: string;
  accountName?: string;
  reusable: boolean;
}

export interface VerifyPaymentResponse {
  success: boolean;
  reference: string;
  amount: number;
  status: PaymentStatus;
  gateway: PaymentGateway;
  metadata?: any;
  paidAt?: Date;
  cardAuthorization?: CardAuthorization;
  customerEmail?: string;
}

export interface DisbursementResponse {
  success: boolean;
  reference: string;
  amount: number;
  recipientId: string;
  gateway: PaymentGateway;
  transferCode?: string;
  status: string;
}

export interface RefundResponse {
  success: boolean;
  reference: string;
  refundReference: string;
  amount: number;
  status: PaymentStatus;
  gateway: PaymentGateway;
}
