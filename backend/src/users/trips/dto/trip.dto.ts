import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RequestRideDto {
  @ApiProperty({ description: 'Pickup address ID' })
  @IsNotEmpty()
  @IsUUID()
  pickupAddressId: string;

  @ApiProperty({ description: 'Dropoff address ID' })
  @IsNotEmpty()
  @IsUUID()
  dropoffAddressId: string;
}

export class RequestDeliveryDto {
  @ApiPropertyOptional({
    description: 'Order ID if this delivery is for an order',
  })
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiProperty({ description: 'Pickup address ID' })
  @IsNotEmpty()
  @IsUUID()
  pickupAddressId: string;

  @ApiProperty({ description: 'Dropoff address ID' })
  @IsNotEmpty()
  @IsUUID()
  dropoffAddressId: string;

  @ApiProperty({ description: 'Recipient name' })
  @IsNotEmpty()
  @IsString()
  recipientName: string;

  @ApiProperty({ description: 'Recipient phone number' })
  @IsNotEmpty()
  @IsString()
  recipientPhone: string;

  @ApiPropertyOptional({ description: 'Package details' })
  @IsOptional()
  @IsString()
  packageDetails?: string;

  @ApiPropertyOptional({ description: 'Package weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;
}

export class CancelTripDto {
  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}
