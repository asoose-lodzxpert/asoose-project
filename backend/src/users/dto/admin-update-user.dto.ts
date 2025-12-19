import { IsEnum, IsOptional } from 'class-validator';
import { UserStatus, UserRole } from '@prisma/client';

export class AdminUpdateUserDto {
  @IsOptional()
  @IsEnum(UserStatus)
  status?: UserStatus;

  @IsOptional()
  @IsEnum(UserRole)
  role?: UserRole;
}