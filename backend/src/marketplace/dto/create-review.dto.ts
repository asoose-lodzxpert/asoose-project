import {
  IsString,
  IsInt,
  Min,
  Max,
  IsUUID,
  IsOptional,
  IsNotEmpty,
} from 'class-validator';

export class CreateReviewDto {
  @IsUUID()
  @IsNotEmpty()
  storeId: string;

  @IsInt()
  @Min(1, { message: 'Rating must be at least 1 star' })
  @Max(5, { message: 'Rating cannot exceed 5 stars' })
  rating: number;

  @IsString()
  @IsOptional()
  comment?: string;
}
