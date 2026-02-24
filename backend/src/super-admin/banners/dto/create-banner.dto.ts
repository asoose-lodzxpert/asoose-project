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
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export enum BannerType {
  PROMO = 'PROMO',
  AD = 'AD',
  INFO = 'INFO',
}

export class CreateBannerDto {
  @ApiProperty({ example: 'Summer Sale' })
  @IsString()
  @IsNotEmpty()
  title: string;

  @ApiProperty({ example: 'Up to 50% off selected items' })
  @IsString()
  @IsNotEmpty()
  subtitle: string;

  @ApiPropertyOptional({ example: 'Shop Now' })
  @IsString()
  @IsOptional()
  buttonText?: string;

  /**
   * Accepts both relative paths (e.g. "/main/store") and absolute URLs.
   * @IsUrl() is intentionally NOT used here.
   */
  @ApiPropertyOptional({ example: '/main/promo' })
  @IsString()
  @IsOptional()
  link?: string;

  @ApiPropertyOptional({
    example: 'banner.jpg',
    type: 'string',
    format: 'binary',
  })
  @IsString()
  @IsOptional()
  image?: string;

  @ApiPropertyOptional({ enum: BannerType, example: BannerType.PROMO })
  @IsEnum(BannerType)
  @IsOptional()
  type?: BannerType;

  @ApiPropertyOptional({ example: 1 })
  @IsNumber()
  @IsOptional()
  @Type(() => Number) // Handle FormData string-to-number conversion
  priority?: number;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true) // Handle FormData boolean
  isActive?: boolean;
}

/** PartialType makes every field optional for PATCH requests */
export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

export class ReorderBannersDto {
  @ApiProperty({ type: [String], example: ['id1', 'id2', 'id3'] })
  @IsArray()
  @IsString({ each: true })
  ids: string[];
}
