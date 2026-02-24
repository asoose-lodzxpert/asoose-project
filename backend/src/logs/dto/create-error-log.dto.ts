import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateErrorLogDto {
  @ApiProperty({ example: 'TypeError: Cannot read properties of undefined' })
  @IsString()
  @IsNotEmpty()
  message: string;

  @ApiPropertyOptional({ example: 'OrderScreen' })
  @IsString()
  @IsOptional()
  context?: string;

  @ApiPropertyOptional({ example: 'TypeError: ...\n    at OrderScreen.tsx:42' })
  @IsString()
  @IsOptional()
  stack?: string;

  @ApiPropertyOptional({ example: 'Samsung Galaxy S23' })
  @IsString()
  @IsOptional()
  device?: string;

  @ApiPropertyOptional({ example: 'android' })
  @IsString()
  @IsOptional()
  platform?: string;

  @ApiPropertyOptional({ example: '2026-02-24T10:00:00.000Z' })
  @IsString()
  @IsOptional()
  timestamp?: string;
}
