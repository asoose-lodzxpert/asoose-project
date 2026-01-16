import { IsNumber, IsString, IsNotEmpty, Min } from 'class-validator';

export class CreateWithdrawalDto {
  @IsNumber()
  @Min(0)
  @IsNotEmpty()
  amount: number;

  @IsString()
  @IsNotEmpty()
  bankAccountId: string;
}
