// Import enums from shared location
import type {
  PaymentGateway,
  PaymentStatus,
  PaymentMethod,
  TransactionType,
  PaymentType,
  RecipientType,
} from '../enums/payment.enums';

// Re-export enums for backward compatibility
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
