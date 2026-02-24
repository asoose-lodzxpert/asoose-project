import {
  IsString,
  IsNotEmpty,
  IsArray,
  IsBoolean,
  IsOptional,
  IsNumber,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

class Coordinate {
  @ApiProperty({ example: 9.0765 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 7.3986 })
  @IsNumber()
  lng: number;
}

export class CreateZoneDto {
  @ApiProperty({ example: 'Abuja Metropolitan Zone' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiPropertyOptional({ example: 'Covers FCT and environs' })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [Coordinate] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => Coordinate)
  coordinates: Coordinate[];

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;

  @ApiPropertyOptional({
    example: 1.2,
    description: 'Price multiplier for this zone',
  })
  @IsNumber()
  @IsOptional()
  basePriceMultiplier?: number;
}

export class UpdateZoneDto extends CreateZoneDto {}
