import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VehicleType {
  ECONOMY = 'ECONOMY',
  BUSINESS = 'BUSINESS',
}

export class LocationDto {
  @ApiProperty()
  @IsNumber()
  latitude: number;

  @ApiProperty()
  @IsNumber()
  longitude: number;

  @ApiProperty()
  @IsString()
  address: string;
}

export class RequestRideDto {
  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation: LocationDto;

  @ApiProperty({ type: LocationDto })
  @ValidateNested()
  @Type(() => LocationDto)
  dropoffLocation: LocationDto;

  @ApiProperty({ enum: VehicleType })
  @IsEnum(VehicleType)
  vehicleType: VehicleType;

  @ApiProperty()
  @IsNumber()
  fare: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class RideEstimateDto {
  @ApiProperty()
  @IsNumber()
  pickupLat: number;

  @ApiProperty()
  @IsNumber()
  pickupLng: number;

  @ApiProperty()
  @IsNumber()
  dropoffLat: number;

  @ApiProperty()
  @IsNumber()
  dropoffLng: number;

  @ApiPropertyOptional({ enum: VehicleType })
  @IsOptional()
  @IsEnum(VehicleType)
  vehicleType?: VehicleType;
}

export class CancelTripDto {
  @ApiPropertyOptional({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// Keep RequestDeliveryDto as is, or update similarly if needed...
export class RequestDeliveryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Pickup address ID (optional if coordinates provided)',
  })
  @IsOptional()
  @IsUUID()
  pickupAddressId?: string;

  @ApiPropertyOptional({
    description: 'Dropoff address ID (optional if coordinates provided)',
  })
  @IsOptional()
  @IsUUID()
  dropoffAddressId?: string;

  @ApiPropertyOptional({
    type: LocationDto,
    description: 'Pickup location with coordinates and address',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  pickupLocation?: LocationDto;

  @ApiPropertyOptional({
    type: LocationDto,
    description: 'Dropoff location with coordinates and address',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationDto)
  dropoffLocation?: LocationDto;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  recipientName: string;

  @ApiProperty()
  @IsNotEmpty()
  @IsString()
  recipientPhone: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderPhone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  senderInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  recipientInstructions?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageDetails?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  packageSize?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  declaredValue?: string;

  @ApiPropertyOptional()
  @IsOptional()
  fragile?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  perishable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  containsLiquid?: boolean;
}
