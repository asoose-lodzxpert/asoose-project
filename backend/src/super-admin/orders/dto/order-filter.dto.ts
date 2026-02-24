import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class OrderFilterDto {
  @ApiPropertyOptional({ example: 'ORD-001' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'PENDING' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'FOOD' })
  @IsOptional()
  @IsString()
  type?: string; // Food, Grocery, etc.

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
  page?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  limit?: number;
}
