import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Req,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { VendorService } from './vendor.service';
import { VendorAuthService } from '../auth/vendor-auth.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller({
  path: 'vendor/dashboard',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class VendorController {
  constructor(
    private readonly vendorService: VendorService,
    private readonly vendorAuthService: VendorAuthService,
  ) {}

  @Get('me')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // Cache for 2 minutes
  async getMe(@Req() req) {
    const { id } = req.user || {};
    return await this.vendorAuthService.getPublicVendorDetails(id);
  }

  @Patch('update-image')
  @Roles(UserRole.VENDOR)
  async updateProfileImage(
    @Req() req,
    @Body() body: { image: string; type?: string },
  ) {
    return await this.vendorService.updateVendorImage(
      req.user.id,
      body.image,
      body.type,
    );
  }

  @Get('public')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(180) // Cache for 3 minutes
  getStorePublic(@Req() req) {
    return this.vendorService.getStorePublicDetails(req.user.id);
  }

  @Get('balance')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30) // Cache for 30 seconds (frequently changes)
  async getStoreBalance(@Req() req) {
    return this.vendorService.getStoreBalance(req.user.id);
  }

  @Get('status')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // Cache for 2 minutes
  getStatus(@Req() req) {
    return this.vendorService.getVendorStatus(req.user.id);
  }

  @Get('active-status')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  getActiveStatus(@Req() req) {
    return this.vendorService.getVendorActiveStatus(req.user.id);
  }

  @Get('metrics')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  getMetrics(@Req() req) {
    return this.vendorService.getStoreMetrics(req.user.id);
  }

  @Get('is-online')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30) // Cache for 30 seconds
  isOnline(@Req() req) {
    return this.vendorService.isStoreOnline(req.user.id);
  }

  @Post('toggle-online')
  @Roles(UserRole.VENDOR)
  toggleOnline(@Req() req) {
    return this.vendorService.toggleStoreOnline(req.user.id);
  }

  @Get('orders')
  @Roles(UserRole.VENDOR)
  getOrders(@Req() req) {
    return this.vendorService.getStoreOrders(req.user.id);
  }

  @Get('bank-accounts')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes (rarely changes)
  getBankAccounts(@Req() req) {
    return this.vendorService.getBankAccounts(req.user.id);
  }

  @Get('banks')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600) // Cache for 1 hour
  getBanks() {
    return this.vendorService.getBanks();
  }

  @Post('verify-account')
  @Roles(UserRole.VENDOR)
  verifyAccountNumber(
    @Body() body: { bankCode: string; accountNumber: string },
  ) {
    return this.vendorService.verifyAccountNumber(
      body.bankCode,
      body.accountNumber,
    );
  }

  @Get('bank-account')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes (rarely changes)
  getBankAccount(@Req() req) {
    return this.vendorService.getBankAccount(req.user.id);
  }

  @Post('bank-account')
  @Roles(UserRole.VENDOR)
  saveBankAccount(
    @Req() req,
    @Body()
    body: {
      bankName: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
    },
  ) {
    return this.vendorService.saveBankAccount(req.user.id, body);
  }

  @Patch('bank-account')
  @Roles(UserRole.VENDOR)
  updateBankAccount(
    @Req() req,
    @Body()
    body: {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
    },
  ) {
    return this.vendorService.updateBankAccount(req.user.id, body);
  }

  @Delete('bank-account')
  @Roles(UserRole.VENDOR)
  deleteBankAccount(@Req() req) {
    return this.vendorService.deleteBankAccount(req.user.id);
  }

  @Get('withdrawals')
  @Roles(UserRole.VENDOR)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  getWithdrawals(@Req() req) {
    return this.vendorService.getWithdrawals(req.user.id);
  }

  @Post('withdrawals')
  @Roles(UserRole.VENDOR)
  createWithdrawal(
    @Req() req,
    @Body() body: { amount: number; bankAccountId: string },
  ) {
    return this.vendorService.createWithdrawal(req.user.id, body);
  }

  @Post('account/deletion-request')
  @Roles(UserRole.VENDOR)
  requestAccountDeletion(
    @Req() req,
    @Body() body: { reasons: string[]; additionalInfo?: string },
  ) {
    return this.vendorService.requestAccountDeletion(req.user.id, body);
  }

  @Get('account/deletion-status')
  @Roles(UserRole.VENDOR)
  getAccountDeletionStatus(@Req() req) {
    return this.vendorService.getAccountDeletionStatus(req.user.id);
  }
}
