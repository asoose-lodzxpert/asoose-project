import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class FilterDisputesDto {
  @ApiPropertyOptional({ example: 0 })
  @IsOptional()
  @Type(() => Number) // <--- CRITICAL FIX
  @IsInt()
  skip?: number;

  @ApiPropertyOptional({ example: 20 })
  @IsOptional()
  @Type(() => Number) // <--- CRITICAL FIX
  @IsInt()
  take?: number;

  @ApiPropertyOptional({ example: 'OPEN' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'refund' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'HIGH' })
  @IsOptional()
  @IsString()
  priority?: string;

  @IsOptional()
  @IsString()
  category?: string;
}
