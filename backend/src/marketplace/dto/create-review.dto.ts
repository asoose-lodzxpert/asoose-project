import {
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateReviewDto {
  @ApiProperty({ example: 'clx-store-uuid', description: 'Store to review' })
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @ApiProperty({ example: 4, minimum: 1, maximum: 5 })
  @IsInt()
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating cannot exceed 5 stars' })
  rating: number;

  @ApiPropertyOptional({ example: 'Great food, fast delivery!' })
  @IsString()
  @IsOptional()
  comment?: string;
}
