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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export { PaymentType, RecipientType, PaymentGateway, PaymentMethod };

// ✅ Add this Helper Class
export class BankAccountDto {
  @ApiProperty({ example: '3012345678' })
  @IsString()
  accountNumber: string;

  @ApiProperty({ example: '011' })
  @IsString()
  bankCode: string;

  @ApiPropertyOptional({ example: 'EMEKA OKONKWO' })
  @IsString()
  @IsOptional()
  accountName?: string;
}

export class InitiatePaymentDto {
  @ApiPropertyOptional({
    example: 50000,
    description: 'Amount in kobo (min 100)',
  })
  @IsOptional()
  @IsNumber()
  @Min(100)
  amount?: number;

  @ApiProperty({ example: 'customer@example.com' })
  @IsEmail()
  email: string;

  @ApiPropertyOptional({ example: 'Emeka Okonkwo' })
  @IsString()
  @IsOptional()
  customerName?: string;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  phoneNumber?: string;

  @ApiProperty({ enum: PaymentGateway, example: 'PAYSTACK' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiProperty({ enum: PaymentMethod, example: 'CARD' })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ enum: PaymentType, example: 'ORDER' })
  @IsEnum(PaymentType)
  type: PaymentType;

  @ApiPropertyOptional({ example: 'clx-order-id' })
  @ValidateIf((o) => o.type === PaymentType.ORDER && !o.orderGroupId)
  @IsString()
  orderId?: string;

  @ApiPropertyOptional({ example: 'clx-order-group-id' })
  @ValidateIf((o) => o.type === PaymentType.ORDER)
  @IsString()
  @IsOptional()
  orderGroupId?: string;

  @ApiPropertyOptional({ example: 'clx-ride-id' })
  @ValidateIf((o) => o.type === PaymentType.RIDE)
  @IsString()
  rideId?: string;

  @ApiPropertyOptional({ example: 'clx-delivery-id' })
  @ValidateIf((o) => o.type === PaymentType.DELIVERY)
  @IsString()
  deliveryId?: string;

  @ApiPropertyOptional({ example: 'https://myapp.com/payment/callback' })
  @IsString()
  @IsOptional()
  callbackUrl?: string;

  @ApiPropertyOptional({
    description: 'Arbitrary metadata passed to payment provider',
  })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class VerifyPaymentDto {
  @ApiProperty({ example: 'txn_abc123xyz' })
  @IsString()
  reference: string;

  @ApiProperty({ enum: PaymentGateway, example: 'PAYSTACK' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;
}

export class DisbursePaymentDto {
  @ApiProperty({ example: 'clx-rider-id', description: 'Recipient user ID' })
  @IsString()
  recipientId: string;

  @ApiProperty({ enum: RecipientType, example: 'RIDER' })
  @IsEnum(RecipientType)
  recipientType: RecipientType;

  @ApiProperty({ example: 5000, description: 'Amount in kobo (min 100)' })
  @IsNumber()
  @Min(100)
  amount: number;

  @ApiProperty({ enum: PaymentGateway, example: 'PAYSTACK' })
  @IsEnum(PaymentGateway)
  gateway: PaymentGateway;

  @ApiPropertyOptional({ example: 'Delivery payout' })
  @IsString()
  @IsOptional()
  reason?: string;

  @ApiPropertyOptional({ type: () => BankAccountDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => BankAccountDto)
  bankAccount?: BankAccountDto;

  @ApiPropertyOptional({ example: 'idem-ref-abc123' })
  @IsString()
  @IsOptional()
  reference?: string;

  @ApiPropertyOptional({ example: 'Ride earnings - Trip #xyz' })
  @IsString()
  @IsOptional()
  narration?: string;

  @ApiPropertyOptional({ example: 'clx-order-id' })
  @IsString()
  @IsOptional()
  orderId?: string;

  @ApiPropertyOptional({ example: 'clx-ride-id' })
  @IsString()
  @IsOptional()
  rideId?: string;

  @ApiPropertyOptional({ example: 'clx-delivery-id' })
  @IsString()
  @IsOptional()
  deliveryId?: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}

export class ProcessRefundDto {
  @ApiProperty({ example: 'txn_abc123xyz' })
  @IsString()
  paymentReference: string;

  @ApiPropertyOptional({
    example: 2000,
    description: 'Partial refund amount in kobo (omit for full refund)',
  })
  @IsNumber()
  @Min(100)
  @IsOptional()
  amount?: number;

  @ApiProperty({ example: 'Customer requested cancellation' })
  @IsString()
  reason: string;

  @ApiPropertyOptional({ description: 'Arbitrary metadata' })
  @IsObject()
  @IsOptional()
  metadata?: Record<string, any>;
}
