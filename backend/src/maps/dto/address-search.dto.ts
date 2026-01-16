import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';

export class AddressSearchDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  query: string;

  @IsOptional()
  @IsString()
  latitude?: string;

  @IsOptional()
  @IsString()
  longitude?: string;
}
