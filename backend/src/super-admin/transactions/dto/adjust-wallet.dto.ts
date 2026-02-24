import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsString,
  Min,
  IsUUID,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AdjustmentType {
  CREDIT = 'CREDIT',
  DEBIT = 'DEBIT',
}

export enum WalletTargetType {
  VENDOR = 'VENDOR',
  RIDER = 'RIDER',
}

export class AdjustWalletDto {
  @ApiProperty({ format: 'uuid', example: 'a1b2c3d4-e5f6-...' })
  @IsUUID()
  @IsNotEmpty()
  targetId: string; // The Store ID or Rider ID

  @ApiProperty({ enum: WalletTargetType, example: WalletTargetType.VENDOR })
  @IsEnum(WalletTargetType)
  @IsNotEmpty()
  targetType: WalletTargetType;

  @ApiProperty({ enum: AdjustmentType, example: AdjustmentType.CREDIT })
  @IsEnum(AdjustmentType)
  @IsNotEmpty()
  type: AdjustmentType;

  @ApiProperty({ example: 500, minimum: 1 })
  @IsNumber()
  @Min(1)
  amount: number;

  @ApiProperty({ example: 'Goodwill credit for delayed delivery' })
  @IsString()
  @IsNotEmpty()
  description: string;
}
