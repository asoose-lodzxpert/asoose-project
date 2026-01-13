import {
  IsString,
  IsNotEmpty,
  IsUrl,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsOptional,
  IsBoolean,
  Matches,
} from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';

export enum BannerType {
  PROMO = 'PROMO',
  AD = 'AD',
}

export class CreateBannerDto {
  @IsString()
  @IsNotEmpty({ message: 'Title is required' })
  title: string;

  @IsString()
  @IsNotEmpty({ message: 'Subtitle is required' })
  subtitle: string;

  @IsString()
  @IsNotEmpty({ message: 'Button text is required' })
  buttonText: string;

  @IsUrl(
    { protocols: ['http', 'https'], require_protocol: true },
    {
      message: 'Link must be a valid HTTP/HTTPS URL',
    },
  )
  @Matches(/^https?:\/\//, {
    message: 'Link must start with http:// or https://',
  })
  link: string;

  @IsString()
  @IsNotEmpty({ message: 'Banner image is required' })
  image: string;

  @IsEnum(BannerType, { message: 'Type must be either PROMO or AD' })
  type: BannerType;

  @IsInt({ message: 'Priority must be an integer' })
  @Min(0, { message: 'Priority must be at least 0' })
  @Max(100, { message: 'Priority must not exceed 100' })
  priority: number;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}

// UpdateBannerDto makes all fields optional
export class UpdateBannerDto extends PartialType(CreateBannerDto) {}

// Response DTO for type safety
export class BannerResponseDto {
  id: string;
  title: string;
  subtitle: string;
  buttonText: string;
  link: string;
  image: string;
  type: BannerType;
  priority: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}
