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
} from '@nestjs/common';
import { VendorOrdersService } from './vendor-orders.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';

@Controller('vendor/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorOrdersController {
  private readonly logger = new Logger(VendorOrdersController.name);

  constructor(private readonly ordersService: VendorOrdersService) {}

  // GET /vendor/orders?storeId=...&page=1
  @Get()
  async findAll(
    @Request() req,
    @Query('storeId') storeId: string,
    @Query('page') page: number,
  ) {
    if (!storeId) throw new Error('storeId is required');
    const userId = req.user.userId || req.user.sub;
    return this.ordersService.findAll(userId, storeId, Number(page) || 1);
  }

  // PATCH /vendor/orders/:id/accept
  @Patch(':id/accept')
  async accept(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId || req.user.sub;
    this.logger.log(`Vendor ${userId} accepting order ${id}`);
    return this.ordersService.acceptOrder(userId, id);
  }

  // PATCH /vendor/orders/:id/decline
  @Patch(':id/decline')
  async decline(
    @Request() req,
    @Param('id') id: string,
    @Body('reason') reason: string,
  ) {
    const userId = req.user.userId || req.user.sub;
    this.logger.log(`Vendor ${userId} declining order ${id}`);
    return this.ordersService.declineOrder(userId, id, reason || 'Vendor busy');
  }

  // PATCH /vendor/orders/:id/preparing
  @Patch(':id/preparing')
  async preparing(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId || req.user.sub;
    return this.ordersService.startPreparing(userId, id);
  }

  // PATCH /vendor/orders/:id/ready
  @Patch(':id/ready')
  async markReady(@Request() req, @Param('id') id: string) {
    const userId = req.user.userId || req.user.sub;
    this.logger.log(`Vendor ${userId} marked order ${id} as READY`);
    return this.ordersService.markReady(userId, id);
  }
}
