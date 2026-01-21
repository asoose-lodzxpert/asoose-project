import { IsString, IsNumber, IsOptional } from 'class-validator';

export class AcceptDeliveryDto {
  @IsString()
  deliveryId: string;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;
}
