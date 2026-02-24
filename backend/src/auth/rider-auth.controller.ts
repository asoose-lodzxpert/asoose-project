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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
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
  @Post('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req) {
    // Get rider id or email from JWT token
    const { id, email } = req.user || {};
    return await this.riderAuthService.getPublicRiderDetails(id || email);
  }

  @ApiOperation({ summary: 'Login as a rider' })
  @Post('login')
  @Throttle({ default: { limit: 10, ttl: 60 * 1000 } }) // 10 requests per minute
  login(@Body() body) {
    return this.riderAuthService.loginRider(body);
  }

  @ApiOperation({ summary: 'Register a new rider account' })
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  register(@Body() dto: CreateRiderDto) {
    return this.riderAuthService.registerRider(dto);
  }

  @ApiOperation({ summary: 'Send OTP for password reset' })
  @Post('send-otp')
  @Throttle({ default: { limit: 3, ttl: 60 * 60 * 1000 } }) // 3 requests per hour
  sendOtp(@Body() body: { email: string }) {
    return this.riderAuthService.sendOtpForPasswordReset(body.email);
  }

  @ApiOperation({ summary: 'Verify OTP for password reset' })
  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return await this.riderAuthService.verifyOtp(body.email, body.otp);
  }

  @ApiOperation({ summary: 'Reset rider password using OTP' })
  @Post('reset-password')
  @Throttle({ default: { limit: 5, ttl: 60 * 60 * 1000 } }) // 5 requests per hour
  resetPassword(@Body() dto: ResetPasswordDto & { otp: string }) {
    // Only resets password if OTP is valid (frontend should verify first)
    return this.riderAuthService.resetRiderPassword(dto);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider profile' })
  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.riderAuthService.updateRiderProfile(req.user.id, dto);
  }

  @ApiOperation({ summary: 'Refresh rider access token' })
  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return await this.riderAuthService.refreshRiderToken(body.refreshToken);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get rider notification preferences' })
  @UseGuards(JwtAuthGuard)
  @Get('notifications-preferences')
  async getNotificationsPreferences(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.getNotificationsPreferences(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider notification preferences' })
  @UseGuards(JwtAuthGuard)
  @Put('notifications-preferences')
  async updateNotificationsPreferences(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateNotificationsPreferences(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider vehicle details' })
  @UseGuards(JwtAuthGuard)
  @Put('vehicle-details')
  async updateVehicleDetails(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateVehicleDetails(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update rider documents' })
  @UseGuards(JwtAuthGuard)
  @Put('documents')
  async updateDocuments(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateRiderDocuments(id, body);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get full rider details' })
  @UseGuards(JwtAuthGuard)
  @Get('details')
  async getRiderDetails(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.getRiderDetails(id);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Send OTP to change password (authenticated)' })
  @UseGuards(JwtAuthGuard)
  @Post('send-change-password-otp')
  async sendChangePasswordOtp(@Req() req) {
    const { email } = req.user || {};
    return this.riderAuthService.sendOtpForPasswordReset(email);
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify OTP for password change' })
  @UseGuards(JwtAuthGuard)
  @Post('verify-change-password-otp')
  async verifyChangePasswordOtp(@Req() req, @Body() body: { otp: string }) {
    const { email } = req.user || {};
    const isValid = await this.riderAuthService.verifyOtp(email, body.otp);
    return { valid: isValid };
  }

  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change rider password with OTP' })
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  @Delete('push-token')
  async deletePushToken(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.deletePushToken(id);
  }
}
