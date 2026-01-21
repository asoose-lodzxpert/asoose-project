import { IsString, IsOptional } from 'class-validator';

export class CompleteDeliveryDto {
  @IsString()
  deliveryId: string;

  @IsOptional()
  @IsString()
  deliveryProof?: string;

  @IsOptional()
  @IsString()
  deliveryOtp?: string;
}
