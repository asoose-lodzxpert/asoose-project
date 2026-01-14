import {
  Controller,
  Post,
  Body,
  Patch,
  Req,
  UseGuards,
  Get,
  Put,
} from '@nestjs/common';
import { RiderAuthService } from './rider-auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { CreateRiderDto } from '../auth/dto/create-rider.dto';
import { ResetPasswordDto } from '../auth/dto/reset-password.dto';
import { UpdateProfileDto } from '../auth/dto/update-profile.dto';

@Controller('auth/rider')
export class RiderAuthController {
  constructor(private readonly riderAuthService: RiderAuthService) {}

  @Post('me')
  @UseGuards(JwtAuthGuard)
  async getMe(@Req() req) {
    // Get rider id or email from JWT token
    const { id, email } = req.user || {};
    return await this.riderAuthService.getPublicRiderDetails(id || email);
  }

  @Post('login')
  login(@Body() body) {
    return this.riderAuthService.loginRider(body);
  }

  @Post('register')
  register(@Body() dto: CreateRiderDto) {
    return this.riderAuthService.registerRider(dto);
  }

  @Post('send-otp')
  sendOtp(@Body() body: { email: string }) {
    return this.riderAuthService.sendOtpForPasswordReset(body.email);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return await this.riderAuthService.verifyOtp(body.email, body.otp);
  }

  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto & { otp: string }) {
    // Only resets password if OTP is valid (frontend should verify first)
    return this.riderAuthService.resetRiderPassword(dto);
  }

  @Patch('profile')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  updateProfile(@Body() dto: UpdateProfileDto, @Req() req) {
    return this.riderAuthService.updateRiderProfile(req.user.id, dto);
  }

  @Post('refresh')
  async refreshToken(@Body() body: { refreshToken: string }) {
    return await this.riderAuthService.refreshRiderToken(body.refreshToken);
  }

  @UseGuards(JwtAuthGuard)
  @Get('notifications-preferences')
  async getNotificationsPreferences(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.getNotificationsPreferences(id);
  }

  @UseGuards(JwtAuthGuard)
  @Put('notifications-preferences')
  async updateNotificationsPreferences(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateNotificationsPreferences(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('vehicle-details')
  async updateVehicleDetails(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateVehicleDetails(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Put('documents')
  async updateDocuments(@Req() req, @Body() body) {
    const { id } = req.user || {};
    return this.riderAuthService.updateRiderDocuments(id, body);
  }

  @UseGuards(JwtAuthGuard)
  @Get('details')
  async getRiderDetails(@Req() req) {
    const { id } = req.user || {};
    return this.riderAuthService.getRiderDetails(id);
  }

  @UseGuards(JwtAuthGuard)
  @Post('send-change-password-otp')
  async sendChangePasswordOtp(@Req() req) {
    const { email } = req.user || {};
    return this.riderAuthService.sendOtpForPasswordReset(email);
  }

  @UseGuards(JwtAuthGuard)
  @Post('verify-change-password-otp')
  async verifyChangePasswordOtp(@Req() req, @Body() body: { otp: string }) {
    const { email } = req.user || {};
    const isValid = await this.riderAuthService.verifyOtp(email, body.otp);
    return { valid: isValid };
  }

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

  @UseGuards(JwtAuthGuard)
  @Post('push-token')
  async savePushToken(
    @Req() req,
    @Body() body: { token: string; platform: string },
  ) {
    const { id } = req.user || {};
    return this.riderAuthService.savePushToken(id, body.token, body.platform);
  }
}
