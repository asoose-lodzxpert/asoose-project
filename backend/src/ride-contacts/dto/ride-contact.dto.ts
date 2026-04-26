import { IsNotEmpty, IsOptional, IsString, Matches } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateRideContactDto {
  @ApiProperty({ example: 'Mum', description: 'Full name of the passenger' })
  @IsNotEmpty()
  @IsString()
  name: string;

  @ApiProperty({ example: '+2348012345678', description: 'Phone number (international format)' })
  @IsNotEmpty()
  @IsString()
  @Matches(/^\+?[0-9\s\-().]{7,20}$/, { message: 'Invalid phone number format' })
  phone: string;

  @ApiPropertyOptional({ example: 'Mum', description: 'Short memorable label for this contact' })
  @IsOptional()
  @IsString()
  label?: string;
}

export class UpdateRideContactDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9\s\-().]{7,20}$/, { message: 'Invalid phone number format' })
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  label?: string;
}
