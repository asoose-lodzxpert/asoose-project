import { IsOptional, IsInt, IsString } from 'class-validator';
import { Type } from 'class-transformer';

export class FilterDisputesDto {
  @IsOptional()
  @Type(() => Number) // <--- CRITICAL FIX
  @IsInt()
  skip?: number;

  @IsOptional()
  @Type(() => Number) // <--- CRITICAL FIX
  @IsInt()
  take?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  search?: string;

  @IsOptional()
  @IsString()
  priority?: string;
}