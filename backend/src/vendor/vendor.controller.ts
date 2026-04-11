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
import { ADMIN_ROLES } from '../auth/decorators/admin-roles.constant';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Vendor / Dashboard')
@ApiBearerAuth()
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

  @ApiOperation({ summary: 'Get authenticated vendor profile' })
  @Get('me')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // Cache for 2 minutes
  async getMe(@Req() req) {
    const { id } = req.user || {};
    return await this.vendorAuthService.getPublicVendorDetails(id);
  }

  @ApiOperation({ summary: 'Update vendor store profile image' })
  @Patch('update-image')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
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

  @ApiOperation({ summary: 'Get public store details (name, logo, address)' })
  @Get('public')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(180) // Cache for 3 minutes
  getStorePublic(@Req() req) {
    return this.vendorService.getStorePublicDetails(req.user.id);
  }

  @ApiOperation({ summary: 'Get vendor wallet balance' })
  @Get('balance')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30) // Cache for 30 seconds (frequently changes)
  async getStoreBalance(@Req() req) {
    return this.vendorService.getStoreBalance(req.user.id);
  }

  @ApiOperation({
    summary: 'Get vendor account status (ACTIVE, PENDING, SUSPENDED)',
  })
  @Get('status')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(120) // Cache for 2 minutes
  getStatus(@Req() req) {
    return this.vendorService.getVendorStatus(req.user.id);
  }

  @ApiOperation({
    summary: 'Get whether the store is currently accepting orders',
  })
  @Get('active-status')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  getActiveStatus(@Req() req) {
    return this.vendorService.getVendorActiveStatus(req.user.id);
  }

  @ApiOperation({
    summary: 'Get store sales metrics (total orders, revenue, etc.)',
  })
  @Get('metrics')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  getMetrics(@Req() req) {
    return this.vendorService.getStoreMetrics(req.user.id);
  }

  @ApiOperation({ summary: 'Check if store is currently online' })
  @Get('is-online')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30) // Cache for 30 seconds
  isOnline(@Req() req) {
    return this.vendorService.isStoreOnline(req.user.id);
  }

  @ApiOperation({ summary: 'Toggle store between online and offline' })
  @Post('toggle-online')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  toggleOnline(@Req() req) {
    return this.vendorService.toggleStoreOnline(req.user.id);
  }

  @ApiOperation({ summary: 'Get all orders for this vendor store' })
  @Get('orders')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  getOrders(@Req() req) {
    return this.vendorService.getStoreOrders(req.user.id);
  }

  @ApiOperation({ summary: 'Get all saved bank accounts for vendor' })
  @Get('bank-accounts')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes (rarely changes)
  getBankAccounts(@Req() req) {
    return this.vendorService.getBankAccounts(req.user.id);
  }

  @ApiOperation({ summary: 'Get list of supported banks' })
  @Get('banks')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(3600) // Cache for 1 hour
  getBanks() {
    return this.vendorService.getBanks();
  }

  @ApiOperation({ summary: 'Verify a bank account number via Paystack' })
  @Post('verify-account')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  verifyAccountNumber(
    @Body() body: { bankCode: string; accountNumber: string },
  ) {
    return this.vendorService.verifyAccountNumber(
      body.bankCode,
      body.accountNumber,
    );
  }

  @ApiOperation({ summary: 'Get saved bank account for vendor' })
  @Get('bank-account')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(300) // Cache for 5 minutes (rarely changes)
  getBankAccount(@Req() req) {
    return this.vendorService.getBankAccount(req.user.id);
  }

  @ApiOperation({ summary: 'Save a new bank account for payouts' })
  @Post('bank-account')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
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

  @ApiOperation({ summary: 'Update existing bank account details' })
  @Patch('bank-account')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
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

  @ApiOperation({ summary: 'Delete saved bank account' })
  @Delete('bank-account')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  deleteBankAccount(@Req() req) {
    return this.vendorService.deleteBankAccount(req.user.id);
  }

  @ApiOperation({ summary: 'Get vendor withdrawal history' })
  @Get('withdrawals')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(60) // Cache for 1 minute
  getWithdrawals(@Req() req) {
    return this.vendorService.getWithdrawals(req.user.id);
  }

  @ApiOperation({ summary: 'Request a payout withdrawal' })
  @Post('withdrawals')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  createWithdrawal(
    @Req() req,
    @Body() body: { amount: number; bankAccountId: string },
  ) {
    return this.vendorService.createWithdrawal(req.user.id, body);
  }

  @ApiOperation({ summary: 'Submit account deletion request with reasons' })
  @Post('account/deletion-request')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  requestAccountDeletion(
    @Req() req,
    @Body() body: { reasons: string[]; additionalInfo?: string },
  ) {
    return this.vendorService.requestAccountDeletion(req.user.id, body);
  }

  @ApiOperation({ summary: 'Check status of pending account deletion request' })
  @Get('account/deletion-status')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  getAccountDeletionStatus(@Req() req) {
    return this.vendorService.getAccountDeletionStatus(req.user.id);
  }

  @ApiOperation({ summary: 'Get list of active service cities for vendor selection' })
  @Get('cities')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  getActiveCities() {
    return this.vendorService.getActiveCities();
  }

  @ApiOperation({ summary: 'Update the city the vendor store is registered in' })
  @Patch('city')
  @Roles(UserRole.VENDOR, ...ADMIN_ROLES)
  updateStoreCity(@Req() req, @Body() body: { cityId: string }) {
    return this.vendorService.updateStoreCity(req.user.id, body.cityId);
  }
}
