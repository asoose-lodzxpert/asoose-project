import {
  Controller,
  Post,
  Body,
  Patch,
  Req,
  UseGuards,
  Get,
  Put,
  Delete,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
} from '@nestjs/swagger';
import { RiderAuthService } from './rider-auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateRiderDto } from '../auth/dto/create-rider.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@ApiTags('Auth / Rider')
@Controller({
  path: 'auth/rider',
  version: '1',
})
export class RiderAuthController {
  constructor(private readonly riderAuthService: RiderAuthService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current rider profile' })
  @ApiResponse({ status: 200, description: 'Rider profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Get('me')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  async getMe(@Req() req) {
    // Get rider id or email from JWT token
    const { id, email } = req.user || {};
    return await this.riderAuthService.getPublicRiderDetails(id || email);
  }

  @ApiOperation({ summary: 'Login as a rider' })
  @ApiResponse({ status: 200, description: 'Access + refresh tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
  login(@Body() body) {
    return this.riderAuthService.loginRider(body);
  }

  @ApiOperation({ summary: 'Register a new rider account' })
  @ApiResponse({ status: 201, description: 'Rider account created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  register(@Body() dto: CreateRiderDto) {
    return this.riderAuthService.registerRider(dto);
  }

  @ApiOperation({ summary: 'Send OTP for password reset' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent (always 200 to prevent user enumeration)',
  })
  @Post('send-otp')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  sendOtp(@Body() body: { email: string }) {
    return this.riderAuthService.sendOtpForPasswordReset(body.email);
  }

  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP is valid' })
  @ApiResponse({ status: 400, description: 'OTP is invalid or expired' })
  @Post('verify-otp')
  @Throttle({ default: { limit: 5, ttl: 15 * 60_000 } }) // 5 attempts per 15 min — OTP brute-force protection
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return await this.riderAuthService.verifyOtp(body.email, body.otp);
  }

  @ApiOperation({ summary: 'Reset rider password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or weak password' })
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  resetPassword(@Body() dto: ResetPasswordDto & { otp: string }) {
    // Only resets password if OTP is valid (frontend should verify first)
    return this.riderAuthService.resetRiderPassword(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.riderAuthService.updateRiderProfile(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Refresh rider access token' })
  @ApiResponse({
    status: 200,
    description: 'New access + refresh token pair returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token missing, expired, or revoked',
  })
  @Post('refresh')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async refreshToken(@Body() body: { refreshToken: string }) {
    return await this.riderAuthService.refreshRiderToken(body.refreshToken);
  }

  @ApiOperation({ summary: 'Logout and invalidate the supplied refresh token' })
  @ApiResponse({ status: 200, description: 'Refresh token revoked' })
  @Post('logout')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async logout(@Body() body: { refreshToken?: string }) {
    return await this.riderAuthService.logoutRider(body.refreshToken ?? '');
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rider notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('notifications-preferences')
  async getNotificationsPreferences(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.getNotificationsPreferences(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Put('notifications-preferences')
  async updateNotificationsPreferences(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateNotificationsPreferences(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider vehicle details' })
  @ApiResponse({ status: 200, description: 'Vehicle details updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Put('vehicle-details')
  async updateVehicleDetails(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateVehicleDetails(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider documents' })
  @ApiResponse({ status: 200, description: 'Documents updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Put('documents')
  async updateDocuments(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateRiderDocuments(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full rider details' })
  @ApiResponse({ status: 200, description: 'Full rider details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('details')
  async getRiderDetails(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.getRiderDetails(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP to change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'OTP sent to registered email' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('send-change-password-otp')
  async sendChangePasswordOtp(@Req() req) {
    const { email } = req.user || {};
    return this.riderAuthService.sendOtpForPasswordReset(email);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify OTP for password change' })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('verify-change-password-otp')
  async verifyChangePasswordOtp(@Req() req, @Body() body: { otp: string }) {
    const { email } = req.user || {};
    const isValid = await this.riderAuthService.verifyOtp(email, body.otp);
    return { valid: isValid };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change rider password with OTP' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or weak password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('change-password')
  async changePassword(
    @Req() req,
    @Body() body: { otp: string; newPassword: string },
  ) {
    const { email } = req.user || {};
    return this.riderAuthService.changePassword(
      email,
      body.otp,
      body.newPassword,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save push notification token' })
  @ApiResponse({ status: 200, description: 'Push token saved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('push-token')
  async savePushToken(
    @Req() req,
    @Body() body: { token: string; platform: string },
  ) {
    const { id } = req.user || {};
    return this.riderAuthService.savePushToken(id, body.token, body.platform);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove push notification token' })
  @ApiResponse({ status: 200, description: 'Push token removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Delete('push-token')
  async deletePushToken(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.deletePushToken(id);
  }
}
