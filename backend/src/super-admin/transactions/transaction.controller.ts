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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Transactions')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/transactions',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
export class TransactionsController {
  constructor(private readonly transactionsService: TransactionsService) {}

  @ApiOperation({ summary: 'List all transactions with filters' })
  @Get()
  findAll(@Query() query: TransactionFilterDto) {
    return this.transactionsService.findAll(query);
  }

  @ApiOperation({ summary: 'Get transaction details by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.transactionsService.findOne(id);
  }

  @ApiOperation({
    summary: 'Credit or debit a user wallet balance (SUPER_ADMIN only)',
  })
  @Post('adjust-wallet')
  @Roles(UserRole.SUPER_ADMIN)
  @UseGuards(JwtAuthGuard, RolesGuard)
  async adjustWallet(@Body() dto: AdjustWalletDto, @Req() req) {
    return this.transactionsService.adjustWallet(dto, req.user.id);
  }

  @ApiOperation({ summary: 'Manually verify a transaction payment' })
  @Post(':id/verify')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE, UserRole.ADMIN_SUPPORT)
  async verifyPayment(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user.id || req.user.sub;
    return this.transactionsService.verifyTransactionPayment(id, adminId);
  }
}
