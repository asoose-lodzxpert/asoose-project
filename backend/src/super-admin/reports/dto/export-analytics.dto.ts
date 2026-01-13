import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { GetAnalyticsDto } from './get-analytics.dto';

export class ExportAnalyticsDto extends GetAnalyticsDto {
  @ApiProperty({
    description: 'Export format',
    enum: ['csv', 'json'],
    default: 'csv',
  })
  @IsEnum(['csv', 'json'])
  format: 'csv' | 'json';
}
