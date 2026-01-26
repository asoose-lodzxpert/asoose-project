import { IsString } from 'class-validator';

export class RideFareDto {
  @IsString()
  pickuplat: string;

  @IsString()
  pickuplong: string;

  @IsString()
  dropofflat: string;

  @IsString()
  dropofflong: string;
}
