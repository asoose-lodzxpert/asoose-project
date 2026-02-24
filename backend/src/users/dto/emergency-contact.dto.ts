import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateEmergencyContactDto {
  @ApiProperty({ example: 'Ngozi Okafor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Sister' })
  @IsString()
  @IsNotEmpty()
  relationship: string;
}

export class UpdateEmergencyContactDto {
  @ApiProperty({ example: 'Ngozi Okafor' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: '+2348012345678' })
  @IsString()
  @IsNotEmpty()
  phone: string;

  @ApiProperty({ example: 'Sister' })
  @IsString()
  @IsNotEmpty()
  relationship: string;
}
