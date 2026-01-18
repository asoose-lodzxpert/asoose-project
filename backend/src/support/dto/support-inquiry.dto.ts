import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';

export class SupportInquiryDto {
  @IsString() @IsNotEmpty()
  name: string;

  @IsEmail()
  email: string;

  @IsString() @IsNotEmpty()
  subject: string;

  @IsString() @IsNotEmpty() @MinLength(10)
  message: string;
}