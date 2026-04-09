import {
  IsString,
  IsNotEmpty,
  IsBoolean,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCityDto {
  @ApiProperty({ example: 'Maiduguri' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Borno' })
  @IsString()
  @IsNotEmpty()
  state: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
