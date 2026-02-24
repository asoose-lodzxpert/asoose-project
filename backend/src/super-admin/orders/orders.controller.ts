import {
  Controller,
  Get,
  Param,
  Delete,
  Query,
  UseGuards,
  Patch, // ✅ Add Patch
  Body, // ✅ Add Body
  Req,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { OrderFilterDto } from './dto/order-filter.dto';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Orders')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/orders',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @ApiOperation({ summary: 'List all orders with filters' })
  @Get()
  @Roles('SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT', 'ADMIN_FINANCE')
  findAll(@Query() query: OrderFilterDto) {
    return this.ordersService.findAll(query);
  }

  @ApiOperation({ summary: 'Get order details by ID' })
  @Get(':id')
  @Roles('SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT', 'ADMIN_FINANCE')
  findOne(@Param('id') id: string) {
    return this.ordersService.findOne(id);
  }

  @ApiOperation({ summary: 'Delete an order record' })
  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.ordersService.remove(id);
  }

  @ApiOperation({ summary: 'Force-update order status (SUPER_ADMIN only)' })
  @Patch(':id/override')
  @Roles(UserRole.SUPER_ADMIN) // Restrict to Super Admin only
  async forceUpdate(
    @Param('id') id: string,
    @Body() body: { status: any; reason: string },
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.ordersService.forceStatusChange(
      id,
      body.status,
      body.reason,
      adminId,
    );
  }
}
