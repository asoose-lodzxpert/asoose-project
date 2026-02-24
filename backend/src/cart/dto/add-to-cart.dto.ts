import {
  IsString,
  IsInt,
  Min,
  IsUUID,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddToCartDto {
  @ApiProperty({ example: 'clx-product-uuid' })
  @IsUUID()
  @IsString()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({
    example: ['clx-modifier-uuid'],
    type: [String],
    description: 'Selected modifier IDs (backend re-prices from DB)',
  })
  @IsArray()
  @IsString({ each: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  modifierIds?: string[];
}
