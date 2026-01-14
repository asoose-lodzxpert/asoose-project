import { Controller, Post, Body, Req, UseGuards, Patch } from '@nestjs/common';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guards';
import { Roles } from './roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Universal login route (role-based)
  @Post('login')
  login(@Body() body) {
    // body: { email, password, role }
    return this.authService.login(body);
  }

  // Universal refresh route
  @Post('refresh')
  refresh(@Body() body) {
    // body: { refreshToken }
    return this.authService.refresh(body.refreshToken);
  }
}

// User Auth
@Controller('auth/user')
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body) {
    return this.authService.loginUser(body);
  }

  @Post('register')
  register(@Body() dto: CreateUserDto) {
    return this.authService.registerUser(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetUserPassword(dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.authService.updateUserProfile(req.user.id, dto);
  }
}

// Driver Auth
@Controller('auth/driver')
export class DriverAuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  login(@Body() body) {
    return this.authService.loginDriver(body);
  }

  @Post('register')
  register(@Body() dto: CreateDriverDto) {
    return this.authService.registerDriver(dto);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetDriverPassword(dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.authService.updateDriverProfile(req.user.id, dto);
  }
}
