import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { BankService } from './bank.service';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Rider / Bank')
@ApiBearerAuth()
@Controller({
  path: 'rider/bank',
  version: '1',
})
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @ApiOperation({ summary: 'Get list of supported banks' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('banks')
  async getBanks() {
    return this.bankService.getBanks();
  }

  @ApiOperation({ summary: 'Verify a bank account number via Paystack' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post('verify-account')
  async verifyAccountNumber(
    @Body() body: { bankCode: string; accountNumber: string },
  ) {
    return this.bankService.verifyAccountNumber(
      body.bankCode,
      body.accountNumber,
    );
  }

  @ApiOperation({ summary: 'Get saved bank account for rider' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('account')
  async getBankAccount(@Req() req) {
    const { id } = req.user || {};
    return this.bankService.getBankAccount(id);
  }

  @ApiOperation({ summary: 'Update rider bank account details' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Patch('account')
  async updateBankAccount(
    @Req() req,
    @Body() updateData: UpdateBankAccountDto,
  ) {
    const { id } = req.user || {};
    return this.bankService.updateBankAccount(id, updateData);
  }
}
