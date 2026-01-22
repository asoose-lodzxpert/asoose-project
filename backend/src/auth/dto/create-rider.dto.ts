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

export class CreateRiderDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  countryCode: string;

  @IsString()
  phone: string;

  @IsEnum(UserRole)
  role: UserRole;

  @IsOptional()
  @IsString()
  image?: string;

  // Vehicle information
  @IsOptional()
  @IsString()
  vehicleType?: string;

  @IsOptional()
  @IsString()
  vehicleBrand?: string;

  @IsOptional()
  @IsString()
  vehicleModel?: string;

  @IsOptional()
  @IsString()
  plateNumber?: string;

  @IsOptional()
  @IsString()
  vehicleColor?: string;

  @IsOptional()
  @IsNumber()
  vehicleYear?: number;

  // Documents
  @IsOptional()
  @IsString()
  driverLicense?: string;

  @IsOptional()
  @IsString()
  vehicleInsurance?: string;

  @IsOptional()
  @IsString()
  vehicleRegistration?: string;

  // Bank Account Information
  @IsOptional()
  @IsString()
  bankName?: string;

  @IsOptional()
  @IsString()
  bankCode?: string;

  @IsOptional()
  @IsString()
  accountNumber?: string;

  @IsOptional()
  @IsString()
  accountName?: string;

  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };
}
