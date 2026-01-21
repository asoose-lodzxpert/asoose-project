import {
  Controller,
  Get,
  UseGuards,
  Req,
  Query,
  Patch,
  Body,
  Post,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { RidersService } from './riders.service';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { UpdateNotificationSettingsDto } from './dto/update-notification-settings.dto';
import { UpdatePersonalInfoDto } from './dto/update-personal-info.dto';
import { CreateWithdrawalDto } from './dto/create-withdrawal.dto';

@Controller('riders')
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('me')
  async getCurrentRider(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getRiderProfile(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('wallet/balance')
  async getWalletBalance(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getWalletBalance(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('earnings')
  async getEarnings(
    @Req() req,
    @Query('timeframe') timeframe: string = 'week',
  ) {
    const { id } = req.user || {};
    return this.ridersService.getEarnings(id, timeframe);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('bank-account')
  async getBankAccount(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getBankAccount(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('bank-account')
  async updateBankAccount(
    @Req() req,
    @Body() updateData: UpdateBankAccountDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.updateBankAccount(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('notification-settings')
  async getNotificationSettings(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getNotificationSettings(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('notification-settings')
  async updateNotificationSettings(
    @Req() req,
    @Body() updateData: UpdateNotificationSettingsDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.updateNotificationSettings(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('personal-info')
  async getPersonalInfo(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getPersonalInfo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('personal-info')
  async updatePersonalInfo(
    @Req() req,
    @Body() updateData: UpdatePersonalInfoDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.updatePersonalInfo(id, updateData);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('withdrawal-info')
  async getWithdrawalInfo(@Req() req) {
    const { id } = req.user || {};
    return this.ridersService.getWithdrawalInfo(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Post('withdraw')
  async requestWithdrawal(
    @Req() req,
    @Body() createWithdrawalDto: CreateWithdrawalDto,
  ) {
    const { id } = req.user || {};
    return this.ridersService.requestWithdrawal(id, createWithdrawalDto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('orders/history')
  async getOrdersHistory(
    @Req() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { id } = req.user || {};
    return this.ridersService.getOrdersHistory(
      id,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
