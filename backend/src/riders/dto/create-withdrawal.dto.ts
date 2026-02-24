import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateWithdrawalDto {
  @ApiProperty({
    example: 5000,
    description: 'Amount in naira to withdraw (minimum 0)',
  })
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @ApiProperty({
    example: 'clx-bank-account-id',
    description: 'Rider bank account record ID',
  })
  @IsString()
  @IsNotEmpty()
  bankAccountId: string;
}
