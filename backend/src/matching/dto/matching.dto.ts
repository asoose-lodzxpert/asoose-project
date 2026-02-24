import {
  IsNotEmpty,
  IsNumber,
  IsString,
  IsOptional,
  IsUUID,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

// ========================================
// RIDE REQUEST DTOs
// ========================================

export class RequestRideDto {
  @ApiProperty({ description: 'Pickup address ID from user addresses' })
  @IsNotEmpty()
  @IsUUID()
  pickupAddressId: string;

  @ApiProperty({ description: 'Dropoff address ID from user addresses' })
  @IsNotEmpty()
  @IsUUID()
  dropoffAddressId: string;
}

export class CancelRideDto {
  @ApiProperty({ description: 'Cancellation reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

export class StartRideDto {
  @ApiProperty({ description: 'Start OTP provided by customer' })
  @IsNotEmpty()
  @IsString()
  startOtp: string;
}

export class CompleteRideDto {
  @ApiProperty({ description: 'Actual distance traveled in km' })
  @IsNumber()
  @Min(0)
  distanceKm: number;

  @ApiProperty({ description: 'Actual duration in minutes' })
  @IsNumber()
  @Min(0)
  durationMin: number;
}

// ========================================
// DELIVERY REQUEST DTOs
// ========================================

export class RequestDeliveryDto {
  @ApiProperty({ description: 'Order ID (if delivery is for an order)' })
  @IsOptional()
  @IsUUID()
  orderId?: string;
  string;

  @ApiProperty({ description: 'Pickup address ID' })
  @IsNotEmpty()
  @IsUUID()
  pickupAddressId: string;

  @ApiProperty({ description: 'Dropoff address ID' })
  @IsNotEmpty()
  @IsUUID()
  dropoffAddressId: string;

  @ApiProperty({ description: 'Package details/description' })
  @IsOptional()
  @IsString()
  packageDetails?: string;

  @ApiProperty({ description: 'Recipient name' })
  @IsNotEmpty()
  @IsString()
  recipientName: string;

  @ApiProperty({ description: 'Recipient phone number' })
  @IsNotEmpty()
  @IsString()
  recipientPhone: string;

  @ApiProperty({ description: 'Package weight in kg' })
  @IsOptional()
  @IsNumber()
  @Min(0)
  weightKg?: number;
}

export class PickupDeliveryDto {
  @ApiProperty({ description: 'Pickup OTP provided by sender' })
  @IsNotEmpty()
  @IsString()
  pickupOtp: string;

  @ApiProperty({ description: 'Pickup proof image URL' })
  @IsOptional()
  @IsString()
  pickupProof?: string;
}

export class CompleteDeliveryDto {
  @ApiProperty({ description: 'Delivery OTP provided by recipient' })
  @IsNotEmpty()
  @IsString()
  deliveryOtp: string;

  @ApiProperty({ description: 'Delivery proof image URL' })
  @IsOptional()
  @IsString()
  deliveryProof?: string;
}

// ========================================
// DRIVER LOCATION DTOs
// ========================================

export class UpdateDriverLocationDto {
  @ApiProperty({ description: 'Latitude', example: 9.0765 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 7.3986 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class SetDriverOnlineDto {
  @ApiProperty({ description: 'Latitude', example: 9.0765 })
  @IsNumber()
  @Min(-90)
  @Max(90)
  lat: number;

  @ApiProperty({ description: 'Longitude', example: 7.3986 })
  @IsNumber()
  @Min(-180)
  @Max(180)
  lng: number;
}

export class SetDriverOfflineDto {
  @ApiProperty({ description: 'Reason for going offline' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ========================================
// DRIVER RESPONSE DTOs
// ========================================

export class AcceptAssignmentDto {
  @ApiProperty({ description: 'Trip type', enum: ['ride', 'delivery'] })
  @IsNotEmpty()
  @IsString()
  tripType: 'ride' | 'delivery';

  @ApiProperty({ description: 'Trip ID (ride or delivery)' })
  @IsNotEmpty()
  @IsUUID()
  tripId: string;
}

export class DeclineAssignmentDto {
  @ApiProperty({ description: 'Trip type', enum: ['ride', 'delivery'] })
  @IsNotEmpty()
  @IsString()
  tripType: 'ride' | 'delivery';

  @ApiProperty({ description: 'Trip ID (ride or delivery)' })
  @IsNotEmpty()
  @IsUUID()
  tripId: string;

  @ApiProperty({ description: 'Decline reason' })
  @IsOptional()
  @IsString()
  reason?: string;
}

// ========================================
// RESPONSE DTOs
// ========================================

export class RideResponseDto {
  id: string;
  customerId: string;
  riderId: string | null;
  pickupAddressId: string;
  dropoffAddressId: string;
  status: string;
  totalFare: number | null;
  distanceKm: number | null;
  durationMin: number | null;
  startOtp: string | null;
  createdAt: Date;
  acceptedAt: Date | null;
  startedAt: Date | null;
  completedAt: Date | null;
}

export class DeliveryResponseDto {
  id: string;
  customerId: string;
  riderId: string | null;
  orderId: string | null;
  pickupAddressId: string;
  dropoffAddressId: string;
  status: string;
  deliveryFee: number;
  packageDetails: string | null;
  recipientName: string;
  recipientPhone: string;
  deliveryOtp: string | null;
  createdAt: Date;
  assignedAt: Date | null;
  pickedUpAt: Date | null;
  deliveredAt: Date | null;
}

export class DriverStatusResponseDto {
  driverId: string;
  status: string; // OFFLINE | ONLINE | ACTIVE
  hexId: string | null;
  lastSeen: number;
  currentRide: string | null;
  currentDelivery: string | null;
  pendingRide: string | null;
  pendingDelivery: string | null;
  location: {
    lat: number;
    lng: number;
  } | null;
}
