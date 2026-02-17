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
import { VendorAuthService } from './vendor-auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateVendorDto } from '../auth/dto/create-vendor.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';
import { LoginVendorDto } from '../auth/dto/login-vendor.dto';

@Controller({
  path: 'auth/vendor',
  version: '1',
})
export class VendorAuthController {
  constructor(private readonly vendorAuthService: VendorAuthService) {}

  @Post('me')
  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  async getMe(@Req() req) {
    const { id, email } = req.user || {};
    return await this.vendorAuthService.getPublicVendorDetails(id || email);
  }

  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
  login(@Body() dto: LoginVendorDto) {
    return this.vendorAuthService.loginVendor(dto);
  }

  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  register(@Body() dto: CreateVendorDto) {
    return this.vendorAuthService.registerVendor(dto);
  }

  @Post('send-otp')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  sendOtp(@Body() body: { email: string }) {
    return this.vendorAuthService.sendOtpForPasswordReset(body.email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return await this.vendorAuthService.verifyOtp(body.email, body.otp);
  }

  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  resetPassword(@Body() dto: ResetPasswordDto & { otp: string }) {
    // Only resets password if OTP is valid (frontend should verify first)
    return this.vendorAuthService.resetVendorPassword(dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.VENDOR)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.vendorAuthService.updateVendorProfile(req.user.id, dto);
  }

  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return await this.vendorAuthService.refreshVendorToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Get('notifications-preferences')
  async getNotificationsPreferences(@Req() req) {
    const { id } = req.user || {};
    return this.vendorAuthService.getNotificationsPreferences(id);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Put('notifications-preferences')
  async updateNotificationsPreferences(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateNotificationsPreferences(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Put('business-info')
  async updateBusinessInfo(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateBusinessInfo(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Put('business-documents')
  async updateBusinessDocuments(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateBusinessDocuments(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Put('store-details')
  async updateStoreDetails(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.vendorAuthService.updateStoreDetails(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Roles(UserRole.VENDOR)
  @Get('business-details')
  async getBusinessDetails(@Req() req) {
    const { id } = req.user || {};
    return this.vendorAuthService.getBusinessDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-change-password-otp')
  async sendChangePasswordOtp(@Req() req) {
    const { email } = req.user || {};
    return this.vendorAuthService.sendOtpForPasswordReset(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-change-password-otp')
  async verifyChangePasswordOtp(@Req() req, @Body() body: { otp: string }) {
    const { email } = req.user || {};
    const isValid = await this.vendorAuthService.verifyOtp(email, body.otp);
    return { valid: isValid };
  }

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

  @UseGuards(JwtAuthGuard)
  @Post('push-token')
  async savePushToken(
    @Req() req,
    @Body() body: { token: string; platform: string },
  ) {
    const { id } = req.user || {};
    return this.vendorAuthService.savePushToken(id, body.token, body.platform);
  }

  @UseGuards(JwtAuthGuard)
  @Delete('push-token')
  async removePushToken(@Req() req) {
    const { id } = req.user || {};
    return this.vendorAuthService.removePushToken(id);
  }

  // ============ TEST ENDPOINTS (DEVELOPMENT ONLY) ============

  @Get('test-email')
  async testEmailSend() {
    const testEmail = 'arhyelphilip024@gmail.com';
    try {
      await this.vendorAuthService.sendOtpForPasswordReset(testEmail);
      return {
        success: true,
        message: `Test email queued successfully to ${testEmail}`,
        timestamp: new Date().toISOString(),
      };
    } catch (error: any) {
      return {
        success: false,
        message: `Failed to queue test email: ${error?.message}`,
        timestamp: new Date().toISOString(),
      };
    }
  }
}
