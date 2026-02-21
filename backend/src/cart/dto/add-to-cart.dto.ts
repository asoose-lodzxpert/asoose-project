import {
  IsString,
  IsInt,
  Min,
  IsUUID,
  IsArray,
  IsOptional,
} from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;

  /**
   * IDs of selected Modifier records for this product.
   * Required when a product has ModifierGroups with minSelect > 0.
   * The backend validates and prices modifiers from the DB — never trust the client price.
   */
  @IsArray()
  @IsUUID('all', { each: true })
  @IsOptional()
  modifierIds?: string[];
}
