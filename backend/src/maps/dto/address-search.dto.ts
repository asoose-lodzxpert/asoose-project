import { IsNotEmpty, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class AddressSearchDto {
  @ApiProperty({ example: 'Adeola Odeku', minLength: 3 })
  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  query: string;

  @ApiPropertyOptional({ example: '6.4281' })
  @IsOptional()
  @IsString()
  latitude?: string;

  @ApiPropertyOptional({ example: '3.4219' })
  @IsOptional()
  @IsString()
  longitude?: string;
}
