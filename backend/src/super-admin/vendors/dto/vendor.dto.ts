import {
  IsArray,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsPositive,
  IsString,
  IsUUID,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// --- ENUMS for Validation ----
export enum VendorCategory {
  RESTAURANT = 'RESTAURANT',
  GROCERY = 'GROCERY',
  PHARMACY = 'PHARMACY',
  MARKET = 'MARKET',
  FASHION = 'FASHION',
  ELECTRONICS = 'ELECTRONICS',
  FURNITURE = 'FURNITURE',
  BEAUTY = 'BEAUTY',
  HEALTH = 'HEALTH',
  EDUCATION = 'EDUCATION',
  SERVICES = 'SERVICES',
  AUTOMOTIVE = 'AUTOMOTIVE',
  TRAVEL = 'TRAVEL',
  ENTERTAINMENT = 'ENTERTAINMENT',
  RETAIL = 'RETAIL',
  ONLINE = 'ONLINE',
  MANUFACTURING = 'MANUFACTURING',
  LOGISTICS = 'LOGISTICS',
  OTHER = 'OTHER',
}

export enum StoreStatus {
  ACTIVE = 'ACTIVE',
  PENDING = 'PENDING',
  SUSPENDED = 'SUSPENDED',
  CLOSED_PERMANENTLY = 'CLOSED_PERMANENTLY',
}

// --- CREATE VENDOR DTO ---
export class CreateVendorDto {
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Emeka Okafor' })
  @IsString()
  @IsNotEmpty()
  name: string; // Owner Name

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: 'pass1234', minLength: 6 })
  @IsString()
  @MinLength(6)
  password: string;

  @ApiProperty({ example: "Emeka's Kitchen" })
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ApiProperty({ example: 'emekas-kitchen' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ enum: VendorCategory, example: VendorCategory.RESTAURANT })
  @IsEnum(VendorCategory)
  type: VendorCategory;
}

// --- QUERY/FILTER DTO ---
export class VendorQueryDto {
  @ApiPropertyOptional({ example: "Emeka's Kitchen" })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({ example: 'ACTIVE' })
  @IsOptional()
  @IsEnum(StoreStatus)
  status?: string;

  @ApiPropertyOptional({ example: 'RESTAURANT' })
  @IsOptional()
  @IsString()
  category?: string;

  @ApiPropertyOptional({ example: 'Verified' })
  @IsOptional()
  @IsString()
  verification?: string; // 'Verified', 'Pending'

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  page?: number = 1;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @Transform(({ value }) => parseInt(value))
  limit?: number = 10;
}

// --- INITIAL PRODUCT DTO (used in manual onboarding) ---
export class InitialProductDto {
  @ApiProperty({ example: 'Jollof Rice' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 1500 })
  @IsNumber()
  @IsPositive()
  price: number;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  @IsNotEmpty()
  categoryId: string;

  @ApiPropertyOptional({ example: 'Delicious Nigerian jollof rice' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 100 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  stock?: number;
}

// --- MANUAL ONBOARD VENDOR DTO ---
// Creates vendor immediately as ACTIVE + VERIFIED, optionally with initial products
export class ManualOnboardVendorDto {
  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Emeka Okafor' })
  @IsString()
  @IsNotEmpty()
  name: string; // Owner Name

  @ApiPropertyOptional({ example: '+2348012345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiProperty({ example: "Emeka's Kitchen" })
  @IsString()
  @IsNotEmpty()
  storeName: string;

  @ApiProperty({ example: 'emekas-kitchen' })
  @IsString()
  @IsNotEmpty()
  slug: string;

  @ApiProperty({ enum: VendorCategory, example: VendorCategory.RESTAURANT })
  @IsEnum(VendorCategory)
  type: VendorCategory;

  @ApiPropertyOptional({ example: '123 Market Street, Abuja' })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: 9.0765 })
  @IsOptional()
  @IsNumber()
  lat?: number;

  @ApiPropertyOptional({ example: 7.3986 })
  @IsOptional()
  @IsNumber()
  lng?: number;

  @ApiPropertyOptional({ type: [InitialProductDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => InitialProductDto)
  initialProducts?: InitialProductDto[];
}
