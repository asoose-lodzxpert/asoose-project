import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';

export class CreateVendorDto {
  @IsString()
  name: string;

  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @IsString()
  countryCode: string;

  @IsString()
  phone: string;

  @IsString()
  businessType: string;

  @IsString()
  employees: string;

  @IsOptional()
  @IsString()
  businessRegCert?: string;

  @IsOptional()
  @IsString()
  taxIdDoc?: string;

  @IsOptional()
  @IsString()
  proofOfAddress?: string;

  @IsOptional()
  @IsString()
  image?: string;

  @IsString()
  storeName: string;

  @IsString()
  storeDescription: string;

  @IsOptional()
  @IsString()
  storeLogo?: string;

  @IsOptional()
  @IsString()
  storeBanner?: string;

  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };

  @IsOptional()
  @IsObject()
  openHours?: any;
}
