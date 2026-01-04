import { IsString, IsOptional, IsBoolean } from 'class-validator';

export class AddMessageDto {
  @IsString()
  message: string;

  @IsOptional()
  @IsBoolean()
  isInternal?: boolean;
  
}