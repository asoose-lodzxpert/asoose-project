import { IsString } from 'class-validator';

export class DeliveryFareDto {
  @IsString()
  pickuplat: string;

  @IsString()
  pickuplong: string;

  @IsString()
  dropofflat: string;

  @IsString()
  dropofflong: string;
}
