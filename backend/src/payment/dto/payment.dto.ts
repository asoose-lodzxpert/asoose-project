import {
  IsEmail,
  IsEnum,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Min,
  ValidateIf,
  ValidateNested, // ✅ Import this
} from 'class-validator';
import { Type } from 'class-transformer'; // ✅ Import this

import {
  PaymentGateway,
  PaymentMethod,
  PaymentType,
  RecipientType,
} from '../enums/payment.enums';

export { PaymentType, RecipientType, PaymentGateway, PaymentMethod };

// ✅ Add this Helper Class
export class BankAccountDto {
  @IsString()
  accountNumber: string;

  @IsString()
  bankCode: string;

  @IsString()
  @IsOptional()
  accountName?: string;
}

export class InitiatePaymentDto {
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

  // ✅ ADDED: Explicit Bank Account Snapshot (Critical for Payout Safety)
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  // ✅ ADDED: Idempotency Reference
  @IsString()
  @IsOptional()
  reference?: string;

  // ✅ ADDED: Narration
  @IsString()
  @IsOptional()
  narration?: string;

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
  amount?: number; 

  @IsString()
  reason: string;

  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}