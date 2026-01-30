import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { TransactionsService } from './transaction.service';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { AdjustWalletDto } from './dto/adjust-wallet.dto';
@Controller('super-admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @Get()
  findAll(@Query() query: TransactionFilterDto) {
    return this.transactionsService.findAll(query);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

<<<<<<< HEAD
  @Post('adjust-wallet')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async adjustWallet(@Body() dto: AdjustWalletDto, @Req() req) {
    return this.transactionsService.adjustWallet(dto, req.user.id);
  }
=======
@Post('adjust-wallet')
@Roles(UserRole.SUPER_ADMIN)
@UseGuards(JwtAuthGuard, RolesGuard)
async adjustWallet(@Body() dto: AdjustWalletDto, @Req() req) {
  return this.transactionsService.adjustWallet(dto, req.user.id);
}


@Post(':id/verify')
  @Roles('SUPER_ADMIN', 'ADMIN_FINANCE', 'ADMIN_SUPPORT') // ✅ Permission Guard
  async verifyPayment(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user.id || req.user.sub;
    return this.transactionsService.verifyTransactionPayment(id, adminId);
  }

>>>>>>> ride_refactored
}
