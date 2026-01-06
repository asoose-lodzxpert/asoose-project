import { IsEnum, IsString, IsOptional, IsNumber, Min } from 'class-validator';

export enum ResolutionAction {
  REFUND_FULL = 'REFUND_FULL',
  REFUND_PARTIAL = 'REFUND_PARTIAL',
  NO_REFUND = 'NO_REFUND',
  REPLACEMENT = 'REPLACEMENT',
  STORE_CREDIT = 'STORE_CREDIT'
}

export enum RefundSource {
  PLATFORM = 'PLATFORM',
  VENDOR_WALLET = 'VENDOR_WALLET',
  PAYMENT_GATEWAY = 'PAYMENT_GATEWAY'
}

export class ResolveDisputeDto {
  @IsEnum(ResolutionAction)
  action: ResolutionAction;

  @IsString()
  resolutionNotes: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  refundAmount?: number;

  @IsOptional()
  @IsEnum(RefundSource)
  refundSource?: RefundSource = RefundSource.PLATFORM;

  // Passed internally, not from request
  adminId?: string;
}
