import {
  IsString,
  IsOptional,
  IsUUID,
  IsArray,
  IsUrl,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDisputeDto {
  @ApiProperty({ example: 'Wrong item delivered' })
  @IsString()
  @IsNotEmpty()
  reason: string;

  // Updated: Made required to ensure actionable context is provided
  @ApiProperty({
    example: 'I ordered jollof rice but received fried rice instead.',
  })
  @IsString()
  @IsNotEmpty()
  description: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  rideId?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  deliveryId?: string;

  @ApiPropertyOptional({
    type: [String],
    example: ['https://example.com/evidence.jpg'],
  })
  @IsOptional()
  @IsArray()
  @IsUrl({}, { each: true })
  evidenceImages?: string[];
}
