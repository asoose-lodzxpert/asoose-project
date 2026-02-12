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
  // ✅ FIX: Made amount optional.
  // The backend will now calculate the total from the Order/Ride/Delivery ID.
  // It is only strictly required for specific types like Wallet Top-up.
  @IsOptional()
  @IsNumber()
  @Min(100)
  amount?: number;

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

  // FIX: Allow orderGroupId for multi-vendor orders
  @ValidateIf((o) => o.type === PaymentType.ORDER && !o.orderGroupId)
  @IsString()
  orderId?: string;

  @ValidateIf((o) => o.type === PaymentType.ORDER)
  @IsString()
  @IsOptional()
  orderGroupId?: string;

  @ValidateIf((o) => o.type === PaymentType.RIDE)
  @IsString()
  rideId?: string;

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

  // FIX: Made gateway required to satisfy PaymentService signature
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