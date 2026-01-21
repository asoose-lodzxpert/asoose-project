import { IsBoolean, IsNumber, IsOptional } from 'class-validator';

export class UpdateRiderStatusDto {
  @IsBoolean()
  isOnline: boolean;

  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @IsOptional()
  @IsNumber()
  currentLng?: number;
}
