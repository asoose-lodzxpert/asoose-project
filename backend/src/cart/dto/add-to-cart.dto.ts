import { IsString, IsInt, Min, IsUUID } from 'class-validator';

export class AddToCartDto {
  @IsUUID()
  @IsString()
  productId: string;

  @IsInt()
  @Min(1)
  quantity: number;
}
