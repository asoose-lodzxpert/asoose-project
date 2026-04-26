import { IsISO8601, IsNotEmpty, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { LocationPayloadDto } from '../../users/trips/dto/trip.dto';

export class BookScheduledRideDto {
  @ApiProperty({ description: 'Scheduled pickup time (ISO 8601 UTC string)' })
  @IsISO8601()
  @IsNotEmpty()
  scheduledAt: string;

  @ApiPropertyOptional({ description: 'Pickup address ID' })
  @IsOptional()
  @IsUUID()
  pickupAddressId?: string;

  @ApiPropertyOptional({ description: 'Dropoff address ID' })
  @IsOptional()
  @IsUUID()
  dropoffAddressId?: string;

  @ApiPropertyOptional({ type: LocationPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationPayloadDto)
  pickupLocation?: LocationPayloadDto;

  @ApiPropertyOptional({ type: LocationPayloadDto })
  @IsOptional()
  @ValidateNested()
  @Type(() => LocationPayloadDto)
  dropoffLocation?: LocationPayloadDto;

  @ApiProperty({ description: 'Vehicle type', example: 'ECONOMY' })
  @IsString()
  @IsNotEmpty()
  vehicleType: string;

  @ApiPropertyOptional({ description: 'Optional payment method' })
  @IsOptional()
  @IsString()
  paymentMethod?: string;

  @ApiPropertyOptional()
  @IsOptional()
  baseFare?: number;

  @ApiPropertyOptional()
  @IsOptional()
  distanceFare?: number;

  @ApiPropertyOptional()
  @IsOptional()
  timeFare?: number;

  @ApiPropertyOptional()
  @IsOptional()
  platformFee?: number;

  @ApiPropertyOptional()
  @IsOptional()
  totalFare?: number;

  @ApiPropertyOptional()
  @IsOptional()
  distanceKm?: number;

  @ApiPropertyOptional()
  @IsOptional()
  durationMin?: number;

  // ── Booking for someone else ─────────────────────────────────────────
  @ApiPropertyOptional({ description: 'Name of the actual passenger (if different from booker)' })
  @IsOptional()
  @IsString()
  passengerName?: string;

  @ApiPropertyOptional({ description: 'Phone of the actual passenger' })
  @IsOptional()
  @IsString()
  passengerPhone?: string;

  @ApiPropertyOptional({ description: 'ID of a saved RideContact' })
  @IsOptional()
  @IsUUID()
  rideContactId?: string;
}
