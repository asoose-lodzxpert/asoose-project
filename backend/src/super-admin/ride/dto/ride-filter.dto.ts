import {
  IsOptional,
  IsString,
  IsEnum,
  IsDateString,
  IsNumber,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class RideFilterDto {
  @ApiPropertyOptional({ example: 'Abuja' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string; // YYYY-MM-DD

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string; // YYYY-MM-DD

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  limit?: number;
}
