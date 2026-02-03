import { Controller, Get, Req, Query, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { OrderService } from './order.service';

@Controller('riders/order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('wallet/balance')
  async getWalletBalance(@Req() req) {
    const { id } = req.user || {};
    return this.orderService.getWalletBalance(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('earnings')
  async getEarnings(
    @Req() req,
    @Query('timeframe') timeframe: string = 'week',
  ) {
    const { id } = req.user || {};
    return this.orderService.getEarnings(id, timeframe);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('history')
  async getOrdersHistory(
    @Req() req,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const { id } = req.user || {};
    return this.orderService.getOrdersHistory(
      id,
      status,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 20,
    );
  }
}
