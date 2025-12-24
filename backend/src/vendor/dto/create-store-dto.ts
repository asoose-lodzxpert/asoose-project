import { IsString, IsNotEmpty, IsOptional, IsEnum } from 'class-validator';

// 1. Define Enum FIRST
export enum StoreType {
  RESTAURANT = 'RESTAURANT',
  GROCERY = 'GROCERY',
  PHARMACY = 'PHARMACY',
  MART = 'MART',
}

// 2. Define Class SECOND
export class CreateStoreDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  address: string;

  // 👇 The error usually happens here
  @IsEnum(StoreType) 
  @IsNotEmpty()
  type: StoreType;

  @IsString()
  @IsOptional()
  image?: string;

  @IsString()
  @IsOptional()
  deliveryTime?: string = "30-45 min";
}