import { Controller, Post, Body, Req, UseGuards, Patch } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthService } from './auth.service';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RolesGuard } from './roles.guards';
import { Roles } from './roles.decorator';
import { CreateUserDto } from './dto/create-user.dto';
import { CreateDriverDto } from './dto/create-driver.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { GoogleOAuthDto } from './dto/google-oauth.dto';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // Universal login route (role-based)
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
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
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
  login(@Body() body) {
    return this.authService.loginUser(body);
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  register(@Body() dto: CreateUserDto) {
    return this.authService.registerUser(dto);
  }

  @Post('oauth/google')
  googleOAuth(@Body() dto: GoogleOAuthDto) {
    return this.authService.googleOAuthUser(dto);
  }

  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotUserPassword(dto);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
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
