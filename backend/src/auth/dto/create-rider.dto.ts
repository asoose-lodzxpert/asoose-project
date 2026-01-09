import { IsEmail, IsString, MinLength } from 'class-validator';

export class CreateRiderDto {
  @IsString()
  name: string;

  @IsEmail()
  email: string;

  @IsString()
  @MinLength(8)
  password: string;

  @IsString()
  vehicleType: string;
}
