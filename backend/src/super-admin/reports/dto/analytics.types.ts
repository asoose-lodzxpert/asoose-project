import { IsOptional, IsDateString, IsEnum } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class GetAnalyticsDto {
  @ApiProperty({
    description: 'Start date for analytics period',
    required: false,
    example: '2024-01-01T00:00:00.000Z',
  })
  @IsOptional()
  @IsDateString()
  startDate?: string;

  @ApiProperty({
    description: 'End date for analytics period',
    required: false,
    example: '2024-01-31T23:59:59.999Z',
  })
  @IsOptional()
  @IsDateString()
  endDate?: string;
}



// ==============================================================
// EXAMPLE API CLIENT FOR FRONTEND (optional utility)
// ==============================================================

// src/lib/api/reports.api.ts (Frontend utility)

