import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsEnum,
  IsArray,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { PartialType } from '@nestjs/swagger';

export enum BannerType {
  PROMO = 'PROMO',
  AD = 'AD',
  INFO = 'INFO',
}

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  subtitle: string;

  @IsString()
  @IsOptional()
  buttonText?: string;

  /**
   * Accepts both relative paths (e.g. "/main/store") and absolute URLs.
   * @IsUrl() is intentionally NOT used here.
   */
  @IsString()
  @IsOptional()
  link?: string;

  @IsString()
  @IsOptional()
  image?: string;

  @IsEnum(BannerType)
  @IsOptional()
  type?: BannerType;

  @IsNumber()
  @IsOptional()
  @Type(() => Number) // Handle FormData string-to-number conversion
  priority?: number;

  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Handle FormData boolean
  isActive?: boolean;
}

/** PartialType makes every field optional for PATCH requests */
export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

export class ReorderBannersDto {
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
