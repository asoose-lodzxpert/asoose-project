import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
} from 'class-validator';

import {
  PaymentGateway,
  PaymentMethod,
  PaymentType,
  RecipientType,
} from '../enums/payment.enums';

export { PaymentType, RecipientType, PaymentGateway, PaymentMethod };

export class InitiatePaymentDto {
  @IsNumber()
  @Min(100)
  amount: number;

  @IsEmail()
  email: string;

  @IsString()
  @IsOptional()
  customerName?: string;

  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsEnum(PaymentType)
  type: PaymentType;

  @ValidateIf((o) => o.type === PaymentType.ORDER)
  @IsString()
  orderId?: string;

  @ValidateIf((o) => o.type === PaymentType.RIDE)
  @IsString()
  rideId?: string;

  // FIX: Added validation for Delivery ID
  @ValidateIf((o) => o.type === PaymentType.DELIVERY)
  @IsString()
  deliveryId?: string;

  @IsString()
  @IsOptional()
  callbackUrl?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class VerifyPaymentDto {
  @IsString()
  reference: string;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}

export class DisbursePaymentDto {
  @IsString()
  recipientId: string;

  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @IsNumber()
  @Min(100)
  amount: number;

  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @IsString()
  @IsOptional()
  reason?: string;

  @IsString()
  @IsOptional()
  orderId?: string;

  @IsString()
  @IsOptional()
  rideId?: string;

  // FIX: Added support for Delivery Disbursements
  @IsString()
  @IsOptional()
  deliveryId?: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProcessRefundDto {
  @IsString()
  paymentReference: string;

  @IsNumber()
  @Min(100)
  @IsOptional()
  amount?: number; // If not provided, full refund

  @IsString()
  reason: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}