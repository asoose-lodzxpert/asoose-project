import {
  IsEnum,
  IsString,
  IsOptional,
  IsNumber,
  Min,
  IsNotEmpty,
} from 'class-validator';
import { Type } from 'class-transformer'; // 👈 Import this
import { ApiProperty } from '@nestjs/swagger';

export enum ResolutionAction {
  REFUND_FULL = 'REFUND_FULL',
  REFUND_PARTIAL = 'REFUND_PARTIAL',
  NO_REFUND = 'NO_REFUND',
  REPLACEMENT = 'REPLACEMENT',
  STORE_CREDIT = 'STORE_CREDIT',
}

export enum RefundSource {
  PLATFORM = 'PLATFORM',
  VENDOR_WALLET = 'VENDOR_WALLET',
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY',
}

export class ResolveDisputeDto {
  @ApiProperty({ enum: ResolutionAction })
  @IsEnum(ResolutionAction)
  @IsNotEmpty()
  action: ResolutionAction;

  @ApiProperty()
  @IsString()
  // @IsNotEmpty() // Uncomment if you want to force notes
  resolutionNotes: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number) // 👈 CRITICAL FIX: Converts "5000" string to 5000 number
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @ApiProperty({ enum: RefundSource, required: false })
  @IsOptional()
  @IsEnum(RefundSource)
  refundSource?: RefundSource = RefundSource.PLATFORM;

  // Passed internally, not from request
  @IsOptional() // 👈 Add this to prevent 'property should not exist' errors
  adminId?: string;
}
