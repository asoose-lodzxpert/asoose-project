import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';

export class CreateDisputeDto {
  @IsString()
  @IsNotEmpty()
  reason: string;

  // Updated: Made required to ensure actionable context is provided
  @IsString()
  @IsNotEmpty()
  description: string;

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
