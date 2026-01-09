import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
} from 'class-validator';

export class CreateVendorDto {
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
