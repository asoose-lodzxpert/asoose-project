import {
  IsString,
  IsInt,
  Min,
  IsUUID,
  IsArray,
  IsOptional,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AddToCartDto {
  @IsUUID()
  @IsString()
  productId: string;

  /** Coerce string-typed numerics (e.g. from multipart/form-data) to integer. */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  quantity: number;

  /**
   * IDs of selected Modifier records for this product.
   * Required when a product has ModifierGroups with minSelect > 0.
   * The backend validates and prices modifiers from the DB — never trust the client price.
   */
  @IsArray()
  @IsString({ each: true })
  @IsUUID('all', { each: true })
  @IsOptional()
  modifierIds?: string[];
}
