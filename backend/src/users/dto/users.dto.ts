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
  ArrayMinSize,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

/**
 * DTO for creating a new address
 */
export class CreateAddressDto {
  @ApiProperty({ example: '12 Adeola Odeku Street' })
  @IsString()
  @IsNotEmpty()
  street: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @IsOptional()
  city?: string;

  @ApiPropertyOptional({ example: 'Lagos' })
  @IsString()
  @IsOptional()
  state?: string;

  @ApiPropertyOptional({
    example: 'Home',
    description: 'Label for this address',
  })
  @IsString()
  @IsOptional()
  label?: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isDefault?: boolean;

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsString()
  @IsOptional()
  phone?: string;

  @ApiProperty({ example: 6.4281, description: 'Latitude (-90 to 90)' })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ example: 3.4219, description: 'Longitude (-180 to 180)' })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

/**
 * DTO for order item
 */
export class OrderItemDto {
  @ApiProperty({ example: 'clx1234abcdef', description: 'Product ID' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 2, minimum: 1, maximum: 100 })
  @IsNumber()
  @Min(1, { message: 'Quantity must be at least 1' })
  @Max(100, { message: 'Quantity cannot exceed 100' })
  quantity: number;

  @ApiPropertyOptional({
    example: ['mod-abc', 'mod-xyz'],
    description: 'Selected modifier IDs (prices re-fetched from DB)',
  })
  @IsArray()
  @IsOptional()
  modifierIds?: string[];
}

/**
 * DTO for creating a new order
 */
export class CreateOrderDto {
  @ApiProperty({
    example: 'clx-address-id',
    description: 'Saved address ID for delivery',
  })
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @ApiPropertyOptional({
    example: 'clx-restaurant-id',
    description: 'Required for single-vendor orders',
  })
  @IsString()
  @IsOptional()
  restaurantId?: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}

export class GetQuoteDto {
  @ApiProperty({ example: 'clx-address-id' })
  @IsString()
  @IsNotEmpty()
  addressId: string;

  @ApiProperty({ example: 'clx-restaurant-id' })
  @IsString()
  @IsNotEmpty()
  restaurantId: string;

  @ApiProperty({ type: [OrderItemDto] })
  @IsArray()
  @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}
