import {
  IsOptional,
  IsString,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class TransactionFilterDto {
  @ApiPropertyOptional({ example: 'TXN-001' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'SUCCESS' })
  @IsOptional()
  @IsString()
  status?: string;

  @ApiPropertyOptional({ example: 'PAYMENT' })
  @IsOptional()
  @IsString()
  type?: string;

  @ApiPropertyOptional({ example: '2024-01-01' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ example: '2024-12-31' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number = 10;
}
