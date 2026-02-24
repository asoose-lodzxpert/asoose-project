import {
  IsEmail,
  IsString,
  MinLength,
  IsOptional,
  IsObject,
} from 'class-validator';
import { Transform } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateVendorDto {
  @ApiProperty({ example: 'Amaka Foods' })
  @IsString()
  name: string;

  @ApiProperty({ example: 'vendor@example.com' })
  @IsEmail({}, { message: 'Please provide a valid email address' })
  @Transform(({ value }) => value?.toLowerCase().trim())
  email: string;

  @ApiProperty({ example: 'Password123!', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters long' })
  password: string;

  @ApiProperty({ example: '+234' })
  @IsString()
  countryCode: string;

  @ApiProperty({ example: '08012345678' })
  @IsString()
  phone: string;

  @ApiProperty({ example: 'Restaurant' })
  @IsString()
  businessType: string;

  @ApiProperty({ example: '1-10' })
  @IsString()
  employees: string;

  @ApiPropertyOptional({ description: 'Business registration certificate URL' })
  @IsOptional()
  @IsString()
  businessRegCert?: string;

  @ApiPropertyOptional({ description: 'Tax ID document URL' })
  @IsOptional()
  @IsString()
  taxIdDoc?: string;

  @ApiPropertyOptional({ description: 'Proof of address document URL' })
  @IsOptional()
  @IsString()
  proofOfAddress?: string;

  @ApiPropertyOptional({ description: 'Profile image URL' })
  @IsOptional()
  @IsString()
  image?: string;

  @ApiProperty({ example: 'Amaka Kitchen' })
  @IsString()
  storeName: string;

  @ApiProperty({ example: 'Authentic Nigerian cuisine' })
  @IsString()
  storeDescription: string;

  @ApiPropertyOptional({ description: 'Store logo URL' })
  @IsOptional()
  @IsString()
  storeLogo?: string;

  @ApiPropertyOptional({ description: 'Store banner image URL' })
  @IsOptional()
  @IsString()
  storeBanner?: string;

  @ApiPropertyOptional({ example: { lat: 6.5244, lng: 3.3792 } })
  @IsOptional()
  @IsObject()
  location?: { lat: number; lng: number };

  @ApiPropertyOptional({ description: 'Store opening hours per day' })
  @IsOptional()
  @IsObject()
  openHours?: any;
}
