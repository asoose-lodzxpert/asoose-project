import { IsEmail, IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class SupportInquiryDto {
  @ApiProperty({ example: 'Emeka Okonkwo' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'emeka@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'Cannot complete payment' })
  @IsString()
  @IsNotEmpty()
  subject: string;

  @ApiProperty({
    example: 'I have been trying to pay for my order but it keeps failing...',
    minLength: 10,
  })
  @IsString()
  @IsNotEmpty()
  @MinLength(10)
  message: string;
}
