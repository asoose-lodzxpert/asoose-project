import { IsNotEmpty, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class DirectionsDto {
  @ApiProperty({ example: '6.4281' })
  @IsNotEmpty()
  @IsString()
  originLat: string;

  @ApiProperty({ example: '3.4219' })
  @IsNotEmpty()
  @IsString()
  originLng: string;

  @ApiProperty({ example: '6.5954' })
  @IsNotEmpty()
  @IsString()
  destLat: string;

  @ApiProperty({ example: '3.3451' })
  @IsNotEmpty()
  @IsString()
  destLng: string;
}
