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
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';

@Controller('vendor/orders')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorOrdersController {
  private readonly logger = new Logger(VendorOrdersController.name);

  constructor(private readonly ordersService: VendorOrdersService) {}

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
    this.logger.log(`Vendor ${vendorId} declining order ${id}`);
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
    this.logger.log(`Vendor ${vendorId} marked order ${id} as READY`);
    return this.ordersService.markReady(vendorId, id);
  }
}
