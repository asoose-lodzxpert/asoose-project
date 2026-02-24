import { IsString, IsOptional, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddMessageDto {
  @ApiProperty({
    example: 'We have reviewed your case and will refund shortly.',
  })
  @IsString()
  message: string;

  @ApiPropertyOptional({
    example: false,
    description: 'If true, message is only visible to admins',
  })
  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
}
