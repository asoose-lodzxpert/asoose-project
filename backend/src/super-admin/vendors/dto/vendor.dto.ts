import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsPhoneNumber,
  IsString,
  MinLength,
} from 'class-validator';
import { Transform } from 'class-transformer';

// --- ENUMS for Validation ---
export enum VendorCategory {
  RESTAURANT = 'RESTAURANT',
  GROCERY = 'GROCERY',
  PHARMACY = 'PHARMACY',
  MARKET = 'MARKET',
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  CLOSED_PERMANENTLY = 'CLOSED_PERMANENTLY',
}

// --- CREATE VENDOR DTO ---
export class CreateVendorDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  name: string; // Owner Name

  @IsOptional()
  @IsString()
  phone?: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  storeName: string;

  @IsString()
  @IsNotEmpty()
  slug: string;

  @IsEnum(VendorCategory)
  type: VendorCategory;
}

// --- QUERY/FILTER DTO ---
export class VendorQueryDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsEnum(StoreStatus)
  status?: string;

  @IsOptional()
  @IsString()
  category?: string;

  @IsOptional()
  @IsString()
  verification?: string; // 'Verified', 'Pending'

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}
