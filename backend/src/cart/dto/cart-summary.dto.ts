import {
  IsArray,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsInt,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CartItemDto {
  @ApiProperty({ example: 'clx-product-uuid' })
  @IsString()
  @IsNotEmpty()
  productId: string;

  @ApiProperty({ example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  quantity: number;

  @ApiPropertyOptional({ example: ['clx-modifier-uuid'], type: [String] })
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  modifierIds?: string[];
}

export class GetCartSummaryDto {
  @ApiProperty({ type: [CartItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
