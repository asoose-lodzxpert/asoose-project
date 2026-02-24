import {
  IsString,
  IsEmail,
  IsNotEmpty,
  IsEnum,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export enum AdminRole {
  ADMIN_MANAGER = 'ADMIN_MANAGER', // Operations
  ADMIN_SUPPORT = 'ADMIN_SUPPORT', // Disputes & Tickets
  ADMIN_FINANCE = 'ADMIN_FINANCE', // Transactions (Not for this user, but needed for schema)
  SUPER_ADMIN = 'SUPER_ADMIN', // Only Super Admin can create another Super Admin
}

export class CreateAdminDto {
  @ApiProperty({ example: 'manager@asoose.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Chidi Okeke' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'SecurePass123', minLength: 8 })
  @IsString()
  @MinLength(8, { message: 'Password must be at least 8 characters' })
  password: string;

  @ApiProperty({ enum: AdminRole, example: AdminRole.ADMIN_MANAGER })
  @IsEnum(AdminRole, { message: 'Invalid admin role' })
  role: AdminRole;
}
