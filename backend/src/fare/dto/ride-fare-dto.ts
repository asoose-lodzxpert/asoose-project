import { IsString, IsOptional, IsNotEmpty } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RideFareDto {
  @ApiProperty({ example: '6.4281', description: 'Pickup latitude' })
  @IsNotEmpty()
  pickuplat: string | number;

  @ApiProperty({ example: '3.4219', description: 'Pickup longitude' })
  @IsNotEmpty()
  pickuplong: string | number;

  @ApiProperty({ example: '6.5954', description: 'Dropoff latitude' })
  @IsNotEmpty()
  dropofflat: string | number;

  @ApiProperty({
    example: '3.3451',
    description: 'Dropoff longitude',
  })
  @IsNotEmpty()
  dropofflong: string | number;

  @ApiPropertyOptional({ example: 'STANDARD', description: 'Vehicle type key' })
  @IsOptional()
  @IsString()
  vehicleType?: string;
}
