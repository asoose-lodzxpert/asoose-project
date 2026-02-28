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
  DefaultValuePipe,
  ParseIntPipe,
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
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
  findAll(@Query() query: OrderFilterDto) {
    return this.ordersService.findAll(query);
  }

  @ApiOperation({ summary: 'Get order details by ID' })
  @Get(':id')
  @Roles(
    UserRole.SUPER_ADMIN,
    UserRole.ADMIN_MANAGER,
    UserRole.ADMIN_SUPPORT,
    UserRole.ADMIN_FINANCE,
  )
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

  // ===========================================================================
  // Admin-managed store order actions
  // ===========================================================================

  @ApiOperation({ summary: 'Get all orders across all admin-managed stores' })
  @Get('store-orders')
  async getAllAdminManagedOrders(
    @Query('status') status?: string,
    @Query('storeId') storeId?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.ordersService.getAllAdminManagedOrders(
      storeId,
      status,
      page,
      limit,
    );
  }

  @ApiOperation({ summary: 'Get orders for an admin-managed store' })
  @Get('store/:storeId')
  async getStoreOrders(
    @Param('storeId') storeId: string,
    @Query('status') status?: string,
    @Query('page', new DefaultValuePipe(1), ParseIntPipe) page?: number,
    @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit?: number,
  ) {
    return this.ordersService.getStoreOrders(storeId, status, page, limit);
  }

  @ApiOperation({
    summary: 'Admin accepts a pending order for a managed store',
  })
  @Patch('store/:orderId/accept')
  async adminAcceptOrder(@Param('orderId') orderId: string, @Req() req: any) {
    const adminId = req.user.id || req.user.sub;
    return this.ordersService.adminAcceptOrder(orderId, adminId);
  }

  @ApiOperation({
    summary: 'Admin declines a pending order for a managed store',
  })
  @Patch('store/:orderId/decline')
  async adminDeclineOrder(
    @Param('orderId') orderId: string,
    @Body('reason') reason: string,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.ordersService.adminDeclineOrder(orderId, adminId, reason);
  }

  @ApiOperation({ summary: 'Admin marks order as preparing' })
  @Patch('store/:orderId/preparing')
  async adminStartPreparing(
    @Param('orderId') orderId: string,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.ordersService.adminStartPreparing(orderId, adminId);
  }

  @ApiOperation({ summary: 'Admin marks order as ready for pickup/dispatch' })
  @Patch('store/:orderId/ready')
  async adminMarkReady(@Param('orderId') orderId: string, @Req() req: any) {
    const adminId = req.user.id || req.user.sub;
    return this.ordersService.adminMarkReady(orderId, adminId);
  }
}
