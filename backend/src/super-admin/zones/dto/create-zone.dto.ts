import { IsString, IsNotEmpty, IsArray, IsBoolean, IsOptional, IsNumber, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class Coordinate {
  @IsNumber()
  lat: number;

  @IsNumber()
  lng: number;
}

export class CreateZoneDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Coordinate)
  coordinates: Coordinate[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @IsNumber()
  @IsOptional()
  basePriceMultiplier?: number;
}

export class UpdateZoneDto extends CreateZoneDto {}