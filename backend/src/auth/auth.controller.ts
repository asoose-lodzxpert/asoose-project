import {
  Controller,
  Post,
  Body,
  Req,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
import { AppleOAuthDto } from './dto/apple-oauth.dto';
import { UserRole } from '../common/enums/user-role.enum';

@ApiTags('Auth')
@Controller({
  path: 'auth',
  version: '1',
})
export class AuthController {
  constructor(private readonly authService: AuthService) {}
  // Universal refresh route
  @ApiOperation({ summary: 'Refresh access token using a refresh token' })
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  refresh(@Body() body) {
    return this.authService.refresh(body.refreshToken);
  }
}

// User Auth
@ApiTags('Auth / User')
@Controller({
  path: 'auth/user',
  version: '1',
})
export class UserAuthController {
  constructor(private readonly authService: AuthService) {}

  @ApiOperation({ summary: 'Login as a customer' })
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
  login(@Body() body) {
    return this.authService.loginUser(body);
  }

  @ApiOperation({ summary: 'Register a new customer account' })
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  register(@Body() dto: CreateUserDto) {
    return this.authService.registerUser(dto);
  }

  @ApiOperation({ summary: 'Login or register via Google OAuth' })
  @Post('oauth/google')
  googleOAuth(@Body() dto: GoogleOAuthDto) {
    return this.authService.googleOAuthUser(dto);
  }

  @ApiOperation({ summary: 'Login or register via Apple OAuth' })
  @Post('oauth/apple')
  appleOAuth(@Body() dto: AppleOAuthDto) {
    return this.authService.appleOAuthUser(dto);
  }

  @ApiOperation({ summary: 'Request a password reset email' })
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotUserPassword(dto);
  }

  @ApiOperation({ summary: 'Reset password using token from email' })
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetUserPassword(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer profile' })
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.authService.updateUserProfile(req.user.id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save push notification token' })
  @Post('push-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  savePushToken(@Body() body, @Req() req) {
    return this.authService.savePushToken(
      req.user.id,
      body.token,
      body.platform,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove push notification token' })
  @Delete('push-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER)
  removePushToken(@Req() req) {
    return this.authService.removePushToken(req.user.id);
  }
}
