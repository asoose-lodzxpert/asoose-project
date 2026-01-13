import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
  IsNumber,
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

  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };
}
