import { IsBoolean, IsNumber, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateRiderStatusDto {
  @ApiProperty({
    example: true,
    description: 'Set true to go online, false to go offline',
  })
  @IsBoolean()
  isOnline: boolean;

  @ApiPropertyOptional({ example: 6.4281, description: 'Current latitude' })
  @IsOptional()
  @IsNumber()
  currentLat?: number;

  @ApiPropertyOptional({ example: 3.4219, description: 'Current longitude' })
  @IsOptional()
  @IsNumber()
  currentLng?: number;
}
