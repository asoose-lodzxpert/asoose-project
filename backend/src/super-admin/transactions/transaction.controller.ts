import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { TransactionsService } from './transaction.service';
import { TransactionFilterDto } from './dto/transaction-filter.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('super-admin/transactions')
@UseGuards(JwtAuthGuard, RolesGuard)
// 💰 LOCK: Finance Only
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
}
