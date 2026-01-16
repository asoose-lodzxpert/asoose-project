import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';

export class UpdateBankAccountDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  bankName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(10)
  bankCode?: string;

  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  accountNumber?: string;

  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  accountName?: string;
}
