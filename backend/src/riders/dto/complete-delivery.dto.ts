import { IsString, IsOptional } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CompleteDeliveryDto {
  @ApiProperty({ example: 'clx-delivery-id' })
  @IsString()
  deliveryId: string;

  @ApiPropertyOptional({
    example: 'https://cdn.example.com/proof.jpg',
    description: 'URL of delivery proof photo',
  })
  @IsOptional()
  @IsString()
  deliveryProof?: string;

  @ApiPropertyOptional({
    example: '482910',
    description: 'One-time OTP provided by recipient',
  })
  @IsOptional()
  @IsString()
  deliveryOtp?: string;
}
