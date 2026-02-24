import { IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DeliveryFareDto {
  @ApiProperty({ example: '6.4281', description: 'Pickup latitude as string' })
  @IsString()
  pickuplat: string;

  @ApiProperty({ example: '3.4219', description: 'Pickup longitude as string' })
  @IsString()
  pickuplong: string;

  @ApiProperty({ example: '6.5954', description: 'Dropoff latitude as string' })
  @IsString()
  dropofflat: string;

  @ApiProperty({
    example: '3.3451',
    description: 'Dropoff longitude as string',
  })
  @IsString()
  dropofflong: string;
}
