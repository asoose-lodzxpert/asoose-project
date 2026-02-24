import { UserRole } from '@prisma/client';
import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
  IsNumber,
  IsEnum,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRiderDto {
  @ApiProperty({ example: 'Chidi Okafor' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'rider@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({ example: '+234' })
  @IsString()
  countryCode: string;

  @ApiProperty({ example: '08012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ enum: UserRole, example: UserRole.RIDER })
  @IsEnum(UserRole)
  role: UserRole;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  // Vehicle information
  @ApiPropertyOptional({ example: 'MOTORCYCLE', description: 'Vehicle type' })
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @ApiPropertyOptional({ example: 'Honda' })
  @IsOptional()
  @IsString()
  vehicleBrand?: string;

  @ApiPropertyOptional({ example: 'CBR 500' })
  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @ApiPropertyOptional({ example: 'ABC-123XY' })
  @IsOptional()
  @IsString()
  plateNumber?: string;

  @ApiPropertyOptional({ example: 'Red' })
  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @ApiPropertyOptional({ example: 2022 })
  @IsOptional()
  @IsNumber()
  vehicleYear?: number;

  // Documents
  @ApiPropertyOptional({ description: "Driver's license document URL" })
  @IsOptional()
  @IsString()
  driverLicense?: string;

  @ApiPropertyOptional({ description: 'Vehicle insurance document URL' })
  @IsOptional()
  @IsString()
  vehicleInsurance?: string;

  @ApiPropertyOptional({ description: 'Vehicle registration document URL' })
  @IsOptional()
  @IsString()
  vehicleRegistration?: string;

  // Bank Account Information
  @ApiPropertyOptional({ example: 'Access Bank' })
  @IsOptional()
  @IsString()
  bankName?: string;

  @ApiPropertyOptional({ example: '044' })
  @IsOptional()
  @IsString()
  bankCode?: string;

  @ApiPropertyOptional({ example: '0123456789' })
  @IsOptional()
  @IsString()
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'Chidi Okafor' })
  @IsOptional()
  @IsString()
  accountName?: string;

  @ApiPropertyOptional({ example: { lat: 6.5244, lng: 3.3792 } })
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };
}
