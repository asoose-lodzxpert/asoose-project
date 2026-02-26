import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  Patch,
  Delete,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
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
  @ApiResponse({
    status: 200,
    description: 'New access + refresh token pair returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token missing, expired, or revoked',
  })
  @Post('refresh')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } })
  refresh(@Body() body) {
    return this.authService.refresh(body.refreshToken);
  }

  @ApiOperation({ summary: 'Logout and invalidate the supplied refresh token' })
  @ApiResponse({
    status: 200,
    description: 'Refresh token revoked successfully',
  })
  @ApiResponse({ status: 400, description: 'No refresh token provided' })
  @Post('logout')
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } })
  logout(@Body() body) {
    return this.authService.logout(body.refreshToken ?? '');
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
  @ApiResponse({ status: 200, description: 'Access + refresh tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
  login(@Body() body) {
    return this.authService.loginUser(body);
  }

  @ApiOperation({ summary: 'Register a new customer account' })
  @ApiResponse({
    status: 201,
    description: 'Account created; verification email sent',
  })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  register(@Body() dto: CreateUserDto) {
    return this.authService.registerUser(dto);
  }

  @ApiOperation({ summary: 'Login or register via Google OAuth' })
  @ApiResponse({
    status: 200,
    description: 'Tokens returned for existing or newly-created account',
  })
  @ApiResponse({ status: 400, description: 'Invalid Google ID token' })
  @Post('oauth/google')
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10/min per IP — account enumeration guard
  googleOAuth(@Body() dto: GoogleOAuthDto) {
    return this.authService.googleOAuthUser(dto);
  }

  @ApiOperation({ summary: 'Login or register via Apple OAuth' })
  @ApiResponse({
    status: 200,
    description: 'Tokens returned for existing or newly-created account',
  })
  @ApiResponse({ status: 400, description: 'Invalid Apple identity token' })
  @Post('oauth/apple')
  @Throttle({ default: { limit: 10, ttl: 60_000 } }) // 10/min per IP — account enumeration guard
  appleOAuth(@Body() dto: AppleOAuthDto) {
    return this.authService.appleOAuthUser(dto);
  }

  @ApiOperation({ summary: 'Request a password reset OTP via email' })
  @ApiResponse({
    status: 200,
    description: 'Reset OTP queued (always 200 to prevent user enumeration)',
  })
  @Post('forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotUserPassword(dto);
  }

  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @Post('verify-otp')
  @Throttle({ default: { limit: 10, ttl: 60 * 60 * 1000 } }) // 10 requests per hour
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return await this.authService.verifyUserPasswordResetOtp(
      body.email,
      body.otp,
    );
  }

  @ApiOperation({ summary: 'Reset password using OTP from email' })
  @ApiResponse({ status: 200, description: 'Password updated successfully' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetUserPassword(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update customer profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.authService.updateUserProfile(req.user.id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save push notification token' })
  @ApiResponse({ status: 200, description: 'Push token saved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('push-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  savePushToken(@Body() body, @Req() req) {
    return this.authService.savePushToken(
      req.user.id,
      body.token,
      body.platform,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove push notification token' })
  @ApiResponse({ status: 200, description: 'Push token removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete('push-token')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  removePushToken(@Req() req) {
    return this.authService.removePushToken(req.user.id);
  }

  // ─── Account Linking ────────────────────────────────────────────────

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get linked OAuth providers for current user' })
  @ApiResponse({
    status: 200,
    description: 'List of linked providers returned',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('linked-accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  getLinkedAccounts(@Req() req) {
    return this.authService.getLinkedAccounts(req.user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link a Google account to the current user' })
  @ApiResponse({ status: 200, description: 'Google account linked' })
  @ApiResponse({
    status: 409,
    description: 'Google account already linked to another user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('link/google')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  linkGoogle(@Body() dto: GoogleOAuthDto, @Req() req) {
    return this.authService.linkGoogleAccount(req.user.id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink Google account from the current user' })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink Google account from the current user' })
  @ApiResponse({ status: 200, description: 'Google account unlinked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete('link/google')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  unlinkGoogle(@Req() req) {
    return this.authService.unlinkGoogleAccount(req.user.id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Link an Apple account to the current user' })
  @ApiResponse({ status: 200, description: 'Apple account linked' })
  @ApiResponse({
    status: 409,
    description: 'Apple account already linked to another user',
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('link/apple')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  linkApple(@Body() dto: AppleOAuthDto, @Req() req) {
    return this.authService.linkAppleAccount(req.user.id, dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Unlink Apple account from the current user' })
  @ApiResponse({ status: 200, description: 'Apple account unlinked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Delete('link/apple')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(
    UserRole.CUSTOMER,
    UserRole.ADMIN,
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  unlinkApple(@Req() req) {
    return this.authService.unlinkAppleAccount(req.user.id);
  }
}
