import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsUUID,
} from 'class-validator';

export enum AdjustmentType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletTargetType {
  VENDOR = 'VENDOR',
  RIDER = 'RIDER',
}

export class AdjustWalletDto {
  @IsUUID()
  @IsNotEmpty()
  targetId: string; // The Store ID or Rider ID

  @IsEnum(WalletTargetType)
  @IsNotEmpty()
  targetType: WalletTargetType;

  @IsEnum(AdjustmentType)
  @IsNotEmpty()
  type: AdjustmentType;

  @IsNumber()
  @Min(1)
  amount: number;

  @IsString()
  @IsNotEmpty()
  description: string;
}
