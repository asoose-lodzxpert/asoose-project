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
import { VendorAuthService } from './vendor-auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateVendorDto } from '../auth/dto/create-vendor.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { LoginVendorDto } from '../auth/dto/login-vendor.dto';

@ApiTags('Auth / Vendor')
@Controller({
  path: 'auth/vendor',
  version: '1',
})
export class VendorAuthController {
  constructor(private readonly vendorAuthService: VendorAuthService) {}

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current vendor profile' })
  @ApiResponse({ status: 200, description: 'Vendor profile returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Post('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  async getMe(@Req() req) {
    const { id, email } = req.user || {};
    return await this.vendorAuthService.getPublicVendorDetails(id || email);
  }

  @ApiOperation({ summary: 'Login as a vendor' })
  @ApiResponse({ status: 200, description: 'Access + refresh tokens returned' })
  @ApiResponse({ status: 401, description: 'Invalid email or password' })
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
  login(@Body() dto: LoginVendorDto) {
    return this.vendorAuthService.loginVendor(dto);
  }

  @ApiOperation({ summary: 'Register a new vendor account' })
  @ApiResponse({ status: 201, description: 'Vendor account created' })
  @ApiResponse({ status: 409, description: 'Email already in use' })
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  register(@Body() dto: CreateVendorDto) {
    return this.vendorAuthService.registerVendor(dto);
  }

  // ---------- Signup Email Verification OTP ----------

  @ApiOperation({ summary: 'Send OTP for email verification during signup' })
  @ApiResponse({ status: 200, description: 'OTP sent to email' })
  @Post('send-signup-otp')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  sendSignupOtp(@Body() body: { email: string }) {
    return this.vendorAuthService.sendSignupOtp(body.email);
  }

  @ApiOperation({ summary: 'Verify OTP for email verification during signup' })
  @ApiResponse({ status: 200, description: 'Email verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @Post('verify-signup-otp')
  async verifySignupOtp(@Body() body: { email: string; otp: string }) {
    return await this.vendorAuthService.verifySignupOtp(body.email, body.otp);
  }

  // ---------- Password Reset OTP ----------

  @ApiOperation({ summary: 'Send OTP for password reset' })
  @ApiResponse({
    status: 200,
    description: 'OTP sent (always 200 to prevent user enumeration)',
  })
  @Post('send-otp')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  sendOtp(@Body() body: { email: string }) {
    return this.vendorAuthService.sendOtpForPasswordReset(body.email);
  }

  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @ApiResponse({ status: 200, description: 'OTP is valid' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return await this.vendorAuthService.verifyOtp(body.email, body.otp);
  }

  @ApiOperation({ summary: 'Reset vendor password using OTP' })
  @ApiResponse({ status: 200, description: 'Password reset successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or weak password' })
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  resetPassword(@Body() dto: ResetPasswordDto & { otp: string }) {
    return this.vendorAuthService.resetVendorPassword(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor profile' })
  @ApiResponse({ status: 200, description: 'Profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.vendorAuthService.updateVendorProfile(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Refresh vendor access token' })
  @ApiResponse({
    status: 200,
    description: 'New access + refresh token pair returned',
  })
  @ApiResponse({
    status: 401,
    description: 'Refresh token missing, expired, or revoked',
  })
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return await this.vendorAuthService.refreshVendorToken(body.refreshToken);
  }

  @ApiOperation({ summary: 'Logout and invalidate the supplied refresh token' })
  @ApiResponse({ status: 200, description: 'Refresh token revoked' })
  @Post('logout')
  async logout(@Body() body: { refreshToken?: string }) {
    return await this.vendorAuthService.logoutVendor(body.refreshToken ?? '');
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Get('notifications-preferences')
  async getNotificationsPreferences(@Req() req) {
    const { id } = req.user || {};
    return this.vendorAuthService.getNotificationsPreferences(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Put('notifications-preferences')
  async updateNotificationsPreferences(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateNotificationsPreferences(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor business information' })
  @ApiResponse({ status: 200, description: 'Business info updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Put('business-info')
  async updateBusinessInfo(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateBusinessInfo(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor business documents' })
  @ApiResponse({ status: 200, description: 'Documents updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @Put('business-documents')
  async updateBusinessDocuments(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateBusinessDocuments(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update vendor store details' })
  @ApiResponse({ status: 200, description: 'Store details updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Put('store-details')
  async updateStoreDetails(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateStoreDetails(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get vendor business details' })
  @ApiResponse({ status: 200, description: 'Business details returned' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Get('business-details')
  async getBusinessDetails(@Req() req) {
    const { id } = req.user || {};
    return this.vendorAuthService.getBusinessDetails(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP to change password (authenticated)' })
  @ApiResponse({ status: 200, description: 'OTP sent to registered email' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Post('send-change-password-otp')
  async sendChangePasswordOtp(@Req() req) {
    const { email } = req.user || {};
    return this.vendorAuthService.sendOtpForPasswordReset(email);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify OTP for password change' })
  @ApiResponse({ status: 200, description: 'OTP verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired OTP' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Post('verify-change-password-otp')
  async verifyChangePasswordOtp(@Req() req, @Body() body: { otp: string }) {
    const { email } = req.user || {};
    const isValid = await this.vendorAuthService.verifyOtp(email, body.otp);
    return { valid: isValid };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change vendor password with OTP' })
  @ApiResponse({ status: 200, description: 'Password changed successfully' })
  @ApiResponse({ status: 400, description: 'Invalid OTP or weak password' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Post('change-password')
  async changePassword(
    @Req() req,
    @Body() body: { otp: string; newPassword: string },
  ) {
    const { email } = req.user || {};
    return this.vendorAuthService.changePassword(
      email,
      body.otp,
      body.newPassword,
    );
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Save push notification token' })
  @ApiResponse({ status: 200, description: 'Push token saved' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Post('push-token')
  async savePushToken(
    @Req() req,
    @Body() body: { token: string; platform: string },
  ) {
    const { id } = req.user || {};
    return this.vendorAuthService.savePushToken(id, body.token, body.platform);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove push notification token' })
  @ApiResponse({ status: 200, description: 'Push token removed' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @UseGuards(JwtAuthGuard)
  @Delete('push-token')
  async removePushToken(@Req() req) {
    const { id } = req.user || {};
    return this.vendorAuthService.removePushToken(id);
  }

  // ============ TEST ENDPOINTS (DEVELOPMENT ONLY) ============

  // @Get('test-email')
  // async testEmailSend() {
  //   const testEmail = 'arhyelphilip024@gmail.com';
  //   try {
  //     await this.vendorAuthService.sendOtpForPasswordReset(testEmail);
  //     return {
  //       success: true,
  //       message: `Test email queued successfully to ${testEmail}`,
  //       timestamp: new Date().toISOString(),
  //     };
  //   } catch (error: any) {
  //     return {
  //       success: false,
  //       message: `Failed to queue test email: ${error?.message}`,
  //       timestamp: new Date().toISOString(),
  //     };
  //   }
  // }
}
