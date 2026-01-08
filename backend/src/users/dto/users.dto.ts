import { 
  IsString, 
  IsBoolean, 
  IsOptional, 
  IsArray, 
  ValidateNested, 
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  ArrayMinSize
} from 'class-validator';
import { Type } from 'class-transformer';

/**
 * DTO for creating a new address
 */
export class CreateAddressDto {
  @IsString()
  @IsNotEmpty()
  street: string;

  @IsString()
  @IsNotEmpty()
  city: string;

  @IsString()
  @IsOptional()
  state?: string;

  @IsString()
  @IsOptional()
  label?: string;

  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

/**
 * DTO for order item
 */
export class OrderItemDto {
  @IsString()
  @IsNotEmpty()
  id: string;

  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(100, { message: 'Quantity cannot exceed 100' })
  quantity: number;
}

/**
 * DTO for creating a new order
 */
export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @IsArray()
  @ArrayMinSize(1, { message: 'Order must contain at least one item' })
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class GetQuoteDto {
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}