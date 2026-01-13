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

export class CartItemDto {
  @IsString()
  @IsNotEmpty()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  // Optional: Array of Modifier IDs if your frontend supports selecting them
  @IsArray()
  @IsOptional()
  @IsString({ each: true })
  modifierIds?: string[];
}

export class GetCartSummaryDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CartItemDto)
  items: CartItemDto[];
}
