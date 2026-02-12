import { PaymentStatus as PrismaPaymentStatus } from '@prisma/client';

// Re-export Prisma's enum as the source of truth
export { PrismaPaymentStatus as PaymentStatus };

// Gateway enum remains standalone as it's not in DB
export enum PaymentGateway {
  PAYSTACK = 'PAYSTACK',
  FLUTTERWAVE = 'FLUTTERWAVE',
  MONNIFY = 'MONNIFY',
}

// Ensure these match your DB or map strictly
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

export enum PaymentType {
  ORDER = 'ORDER',
  RIDE = 'RIDE',
  DELIVERY = 'DELIVERY',
}

export enum RecipientType {
  VENDOR = 'VENDOR',
  RIDER = 'RIDER',
}
