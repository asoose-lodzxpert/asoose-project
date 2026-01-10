import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Req,
  UseGuards,
} from '@nestjs/common';
import { VendorService } from './vendor.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';

@Controller('vendor/dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorController {
  constructor(private readonly vendorService: VendorService) {}

  @Get('public')
  @Roles('VENDOR')
  getStorePublic(@Req() req) {
    return this.vendorService.getStorePublicDetails(req.user.id);
  }

  @Get('balance')
  @Roles('VENDOR')
  async getStoreBalance(@Req() req) {
    return this.vendorService.getStoreBalance(req.user.id);
  }

  @Get('status')
  @Roles('VENDOR')
  getStatus(@Req() req) {
    return this.vendorService.getVendorStatus(req.user.id);
  }

  @Get('active-status')
  @Roles('VENDOR')
  getActiveStatus(@Req() req) {
    return this.vendorService.getVendorActiveStatus(req.user.id);
  }

  @Get('metrics')
  @Roles('VENDOR')
  getMetrics(@Req() req) {
    return this.vendorService.getStoreMetrics(req.user.id);
  }

  @Get('is-online')
  @Roles('VENDOR')
  isOnline(@Req() req) {
    return this.vendorService.isStoreOnline(req.user.id);
  }

  @Post('toggle-online')
  @Roles('VENDOR')
  toggleOnline(@Req() req) {
    return this.vendorService.toggleStoreOnline(req.user.id);
  }

  @Get('orders')
  @Roles('VENDOR')
  getOrders(@Req() req) {
    return this.vendorService.getStoreOrders(req.user.id);
  }

  @Get('bank-accounts')
  @Roles('VENDOR')
  getBankAccounts(@Req() req) {
    return this.vendorService.getBankAccounts(req.user.id);
  }

  @Get('withdrawals')
  @Roles('VENDOR')
  getWithdrawals(@Req() req) {
    return this.vendorService.getWithdrawals(req.user.id);
  }

  @Post('withdrawals')
  @Roles('VENDOR')
  createWithdrawal(
    @Req() req,
    @Body() body: { amount: number; bankAccountId: string },
  ) {
    return this.vendorService.createWithdrawal(req.user.id, body);
  }
}
