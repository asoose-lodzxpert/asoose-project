import { IsNotEmpty, IsString } from 'class-validator';

export class DirectionsDto {
  @IsNotEmpty()
  @IsString()
  originLat: string;

  @IsNotEmpty()
  @IsString()
  originLng: string;

  @IsNotEmpty()
  @IsString()
  destLat: string;

  @IsNotEmpty()
  @IsString()
  destLng: string;
}
