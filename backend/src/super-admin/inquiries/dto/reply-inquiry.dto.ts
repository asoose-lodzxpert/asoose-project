import { IsNotEmpty, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReplyInquiryDto {
  @ApiProperty({ example: 'Thank you for reaching out. We have resolved your issue...' })
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  message: string;
}
