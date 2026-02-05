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
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';

@Controller({
  path: 'vendor/orders',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
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

  @Patch(':id/accept')
  async accept(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.ordersService.acceptOrder(vendorId, id);
  }

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

  @Patch(':id/preparing')
  async preparing(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.ordersService.startPreparing(vendorId, id);
  }

  @Patch(':id/ready')
  async markReady(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.ordersService.markReady(vendorId, id);
  }
}
