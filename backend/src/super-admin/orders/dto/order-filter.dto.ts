import { IsOptional, IsString, IsEnum, IsDateString } from 'class-validator';

export class OrderFilterDto {
  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  type?: string; // Food, Grocery, etc.

  @IsOptional()
  @IsDateString()
  from?: string; // YYYY-MM-DD

  @IsOptional()
  @IsDateString()
  to?: string; // YYYY-MM-DD

  @IsOptional()
  page?: number;

  @IsOptional()
  limit?: number;
}
