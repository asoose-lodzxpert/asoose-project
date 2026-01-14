// Runtime enums for payment validation
// These enums are used in DTOs with @IsEnum() decorator

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

export enum PaymentType {
  ORDER = 'ORDER',
  RIDE = 'RIDE',
}

export enum RecipientType {
  VENDOR = 'VENDOR',
  RIDER = 'RIDER',
}
