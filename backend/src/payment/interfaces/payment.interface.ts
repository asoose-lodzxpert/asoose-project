export enum PaymentGateway {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
  MONNIFY = 'MONNIFY',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  SUCCESS = 'SUCCESS',
  FAILED = 'FAILED',
  CANCELLED = 'CANCELLED',
  REFUNDED = 'REFUNDED',
  PARTIAL_REFUND = 'PARTIAL_REFUND',
}

export enum PaymentMethod {
  CARD = 'CARD',
  BANK_TRANSFER = 'BANK_TRANSFER',
  USSD = 'USSD',
  MOBILE_MONEY = 'MOBILE_MONEY',
}

export enum TransactionType {
  PAYMENT = 'PAYMENT',
  DISBURSEMENT = 'DISBURSEMENT',
  REFUND = 'REFUND',
}

export interface PaymentInitResponse {
  reference: string;
  authorizationUrl?: string;
  accessCode?: string;
  accountNumber?: string;
  bankName?: string;
  accountName?: string;
  amount: number;
  expiresAt?: Date;
}

export interface VerifyPaymentResponse {
  success: boolean;
  reference: string;
  amount: number;
  status: PaymentStatus;
  gateway: PaymentGateway;
  metadata?: any;
  paidAt?: Date;
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
