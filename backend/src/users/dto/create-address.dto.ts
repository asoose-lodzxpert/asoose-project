import { IsString, IsBoolean, IsOptional } from 'class-validator';

export class CreateAddressDto {
  @IsString()
  street: string;

  @IsString()
  city: string;

  @IsString()
  state: string;

  @IsString()
  @IsOptional()
  zipCode: string; 

  @IsString()
  country: string;

  @IsOptional()
  @IsBoolean()
  isDefault?: boolean;
}