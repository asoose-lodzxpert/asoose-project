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
import { BankService } from './bank.service';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@Controller({
  path: 'rider/bank',
  version: '1',
})
export class BankController {
  constructor(private readonly bankService: BankService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('banks')
  async getBanks() {
    return this.bankService.getBanks();
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post('verify-account')
  async verifyAccountNumber(
    @Body() body: { bankCode: string; accountNumber: string },
  ) {
    return this.bankService.verifyAccountNumber(
      body.bankCode,
      body.accountNumber,
    );
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('account')
  async getBankAccount(@Req() req) {
    const { id } = req.user || {};
    return this.bankService.getBankAccount(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Patch('account')
  async updateBankAccount(
    @Req() req,
    @Body() updateData: UpdateBankAccountDto,
  ) {
    const { id } = req.user || {};
    return this.bankService.updateBankAccount(id, updateData);
  }
}
