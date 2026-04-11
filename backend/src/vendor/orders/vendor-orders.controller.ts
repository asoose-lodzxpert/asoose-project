import {
  Controller,
  Get,
  Patch,
  Param,
  Body,
  UseGuards,
  Request,
  Query,
  Logger,
  Sse,
  MessageEvent,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { VendorOrdersService } from './vendor-orders.service';
import { VendorOrdersStreamService } from './vendor-orders-stream.service';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Vendor / Orders')
@ApiBearerAuth()
@Controller({
  path: 'vendor/orders',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR, ...ADMIN_ROLES)
export class VendorOrdersController {
  private readonly logger = new Logger(VendorOrdersController.name);

  constructor(
    private readonly ordersService: VendorOrdersService,
    private readonly streamService: VendorOrdersStreamService,
  ) {}

  /**
   * SSE endpoint for real-time order notifications
   * Vendors connect to this endpoint and receive events when:
   * - New orders are created for their store
   * - Order statuses change
   */
  @ApiOperation({ summary: 'SSE stream for real-time order notifications' })
  @Sse('stream')
  streamOrders(@Request() req): Observable<MessageEvent> {
    const vendorId = req.user.id;
    const storeId = req.user.storeId;

    if (!storeId) {
      this.logger.warn(
        `Vendor ${vendorId} attempted to connect without a storeId`,
      );
      throw new Error('No store associated with this vendor');
    }

    this.logger.log(
      `Vendor ${vendorId} connected to order stream for store ${storeId}`,
    );

    return this.streamService.getOrderStream(storeId);
  }

  @ApiOperation({
    summary:
      'Get all orders for vendor store with optional status filter (paginated)',
  })
  @Get()
  async findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const vendorId = req.user.id;
    return this.ordersService.findAll(
      vendorId,
      status || undefined,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @ApiOperation({ summary: 'Accept an incoming order' })
  @Patch(':id/accept')
  async accept(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.ordersService.acceptOrder(vendorId, id);
  }

  @ApiOperation({ summary: 'Decline an order with a reason' })
  @Patch(':id/decline')
  async decline(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const vendorId = req.user.id;
    return this.ordersService.declineOrder(
      vendorId,
      id,
      reason || 'Vendor busy',
    );
  }

  @ApiOperation({ summary: 'Mark order as being prepared' })
  @Patch(':id/preparing')
  async preparing(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.ordersService.startPreparing(vendorId, id);
  }

  @ApiOperation({ summary: 'Mark order as ready for pickup/dispatch' })
  @Patch(':id/ready')
  async markReady(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.ordersService.markReady(vendorId, id);
  }
}
