import {
  IsString,
  IsOptional,
  IsUUID,
  IsEnum,
  IsArray,
  IsUrl,
} from 'class-validator';
import { DisputePriority } from '@prisma/client';

export class CreateDisputeDto {
  @IsString()
  reason: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(DisputePriority)
  priority?: DisputePriority;

  @IsOptional()
  @IsUUID()
  targetUserId?: string;

  @IsOptional()
  @IsUUID()
  orderId?: string;

  @IsOptional()
  @IsUUID()
  rideId?: string;

  @IsOptional()
  @IsUUID()
  deliveryId?: string;

  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceImages?: string[];
}
