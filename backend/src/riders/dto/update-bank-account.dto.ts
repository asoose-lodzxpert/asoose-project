import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateBankAccountDto {
  @ApiPropertyOptional({ example: 'First Bank of Nigeria' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  bankName?: string;

  @ApiPropertyOptional({ example: '011', description: 'Paystack bank code' })
  @IsOptional()
  @IsString()
  @MaxLength(10)
  bankCode?: string;

  @ApiPropertyOptional({
    example: '3012345678',
    description: 'Must be exactly 10 digits',
  })
  @IsOptional()
  @IsString()
  @MinLength(10)
  @MaxLength(10)
  accountNumber?: string;

  @ApiPropertyOptional({ example: 'EMEKA OKONKWO' })
  @IsOptional()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  accountName?: string;
}
