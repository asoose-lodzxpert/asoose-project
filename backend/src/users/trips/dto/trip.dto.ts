import {
  IsNotEmpty,
  IsUUID,
  IsOptional,
  IsString,
  IsNumber,
  Min,
  IsEnum,
  ValidateNested,
  IsBoolean, // ✅ Added for checkbox validation
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum VehicleType {
  ECONOMY = 'ECONOMY',
  BUSINESS = 'BUSINESS',
}

// ✅ REFACTORED: Hybrid Architecture Location Payload
export class LocationPayloadDto {
  @ApiProperty({ description: 'The text address used for UI display' })
  @IsNotEmpty()
  @IsString()
  addressText: string;

  @ApiPropertyOptional({ description: 'Google Maps Place ID (Primary source of truth)' })
  @IsOptional()
  @IsString()
  placeId?: string;

  @ApiPropertyOptional({ description: 'Latitude (Fallback ONLY for Current Location)' })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ description: 'Longitude (Fallback ONLY for Current Location)' })
  @IsOptional()
  @IsNumber()
  lng?: number;
}

export class RequestRideDto {
  @ApiProperty({ type: LocationPayloadDto })
  @ValidateNested()
  @Type(() => LocationPayloadDto)
  pickupLocation: LocationPayloadDto;

  @ApiProperty({ type: LocationPayloadDto })
  @ValidateNested()
  @Type(() => LocationPayloadDto)
  dropoffLocation: LocationPayloadDto;

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

// ✅ REFACTORED: Estimate DTO modified to accept Place IDs or fallbacks
export class RideEstimateDto {
  @ApiPropertyOptional({ description: 'Pickup Google Place ID' })
  @IsOptional()
  @IsString()
  pickupPlaceId?: string;

  @ApiPropertyOptional({ description: 'Pickup Latitude (Fallback)' })
  @IsOptional()
  @IsNumber()
  pickupLat?: number;

  @ApiPropertyOptional({ description: 'Pickup Longitude (Fallback)' })
  @IsOptional()
  @IsNumber()
  pickupLng?: number;

  @ApiPropertyOptional({ description: 'Dropoff Google Place ID' })
  @IsOptional()
  @IsString()
  dropoffPlaceId?: string;

  @ApiPropertyOptional({ description: 'Dropoff Latitude (Fallback)' })
  @IsOptional()
  @IsNumber()
  dropoffLat?: number;

  @ApiPropertyOptional({ description: 'Dropoff Longitude (Fallback)' })
  @IsOptional()
  @IsNumber()
  dropoffLng?: number;

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

export class RequestDeliveryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  orderId?: string;

  @ApiPropertyOptional({
    description: 'Pickup address ID (optional if coordinates/placeId provided)',
  })
  @IsOptional()
  @IsUUID()
  pickupAddressId?: string;

  @ApiPropertyOptional({
    description: 'Dropoff address ID (optional if coordinates/placeId provided)',
  })
  @IsOptional()
  @IsUUID()
  dropoffAddressId?: string;

  @ApiPropertyOptional({
    type: LocationPayloadDto,
    description: 'Pickup location using Place ID or Fallback Coordinates',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationPayloadDto)
  pickupLocation?: LocationPayloadDto;

  @ApiPropertyOptional({
    type: LocationPayloadDto,
    description: 'Dropoff location using Place ID or Fallback Coordinates',
  })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationPayloadDto)
  dropoffLocation?: LocationPayloadDto;

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
  @IsNumber() // ✅ Changed from String to Number
  @Min(0)     // ✅ Enforce positive value
  declaredValue?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean() // ✅ Added Validation
  fragile?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean() // ✅ Added Validation
  perishable?: boolean;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean() // ✅ Added Validation
  containsLiquid?: boolean;
}