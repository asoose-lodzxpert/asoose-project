import {
  Controller,
  Get,
  Param,
  Query,
  Patch,
  Body,
  ParseIntPipe,
  Post,
  UseGuards,
  Delete,
  Req,
} from '@nestjs/common';
import { RidersService } from './riders.service';
import { UserStatus, VerificationStatus } from '@prisma/client';
import { UserRole } from '../../common/enums/user-role.enum';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';

/**
 * Exposes DRIVER-role riders (ride-hailing drivers) separately from
 * RIDER-role users (delivery riders) at /super-admin/drivers
 */
@Controller({
  path: 'super-admin/drivers',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class DriversController {
  constructor(private readonly ridersService: RidersService) {}

  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.ridersService.findAllDrivers({ search, page, limit, status });
  }

  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findOne(@Param('id') id: string) {
    return this.ridersService.findOne(id);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async updateStatus(
    @Param('id') id: string,
    @Body('status') status: UserStatus,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.updateStatus(id, status, adminId);
  }

  @Patch(':id/documents/:docId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async verifyDocument(
    @Param('id') riderId: string,
    @Param('docId') docId: string,
    @Body('status') status: VerificationStatus,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.verifyDocument(riderId, docId, status, adminId);
  }

  @Get(':id/rides')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getRides(@Param('id') id: string) {
    return this.ridersService.getRiderRides(id);
  }

  @Patch(':id/location')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async updateLocation(
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.ridersService.updateLocation(id, body.lat, body.lng);
  }

  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; email?: string },
  ) {
    return this.ridersService.update(id, body);
  }

  @Post(':id/wallet')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
  async adjustWallet(
    @Param('id') id: string,
    @Body() body: { type: 'CREDIT' | 'DEBIT'; amount: number; reason: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId || 'SYSTEM';
    return this.ridersService.adjustWallet(
      id,
      body.type,
      body.amount,
      body.reason,
      adminId,
    );
  }

  @Post(':id/payouts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
  async createPayout(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.ridersService.requestPayout(id, body.amount);
  }

  @Patch(':id/payouts/:payoutId')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
  async processPayout(
    @Param('payoutId') payoutId: string,
    @Body() body: { status: 'PAID' | 'FAILED'; reference?: string },
  ) {
    return this.ridersService.processPayout(
      payoutId,
      body.status,
      body.reference,
    );
  }

  @Get(':id/payouts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
  async getDriverPayouts(@Param('id') id: string) {
    return this.ridersService.getRiderPayouts(id);
  }

  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN)
  async remove(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.remove(id, adminId);
  }

  @Post(':id/message')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async messageDriver(
    @Param('id') id: string,
    @Body('message') message: string,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.sendMessageToRider(id, message, adminId);
  }

  @Patch(':id/vehicle')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async updateVehicle(
    @Param('id') id: string,
    @Body()
    body: {
      brand?: string;
      model?: string;
      year?: number;
      color?: string;
      plateNumber?: string;
    },
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.updateVehicle(id, body, adminId);
  }

  @Post(':id/kill-switch')
  @Roles(UserRole.SUPER_ADMIN)
  async killSwitch(
    @Param('id') id: string,
    @Body() body: { action: 'SUSPEND' | 'BAN'; reason: string },
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.executeKillSwitch(
      id,
      body.action,
      body.reason,
      adminId,
    );
  }
}
