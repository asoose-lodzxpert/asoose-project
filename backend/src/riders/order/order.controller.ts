import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { OrderService } from './order.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Rider / Orders')
@ApiBearerAuth()
@Controller({
  path: 'rider/order',
  version: '1',
})
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @ApiOperation({ summary: 'Get rider wallet balance' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('wallet/balance')
  async getWalletBalance(@Req() req) {
    const { id } = req.user || {};
    return this.orderService.getWalletBalance(id);
  }

  @ApiOperation({
    summary: 'Get rider earnings summary (daily/weekly/monthly)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('earnings')
  async getEarnings(
    @Req() req,
    @Query('timeframe') timeframe: string = 'week',
  ) {
    const { id } = req.user || {};
    return this.orderService.getEarnings(id, timeframe);
  }

  @ApiOperation({ summary: 'Get paginated job history for rider' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('history')
  async getOrdersHistory(
    @Req() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { id, role } = req.user || {};
    return this.orderService.getOrdersHistory(
      id,
      role,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
