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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Riders')
@ApiBearerAuth()
@Controller({ path: 'super-admin/riders', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
export class RidersController {
  constructor(private readonly ridersService: RidersService) {}

  @ApiOperation({
    summary:
      'List all delivery riders with optional search/pagination/status filter',
  })
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findAll(
    @Query('search') search?: string,
    @Query('page', new ParseIntPipe({ optional: true })) page: number = 1,
    @Query('limit', new ParseIntPipe({ optional: true })) limit: number = 10,
    @Query('status') status?: string,
  ) {
    return this.ridersService.findAll({ search, page, limit, status });
  }

  @ApiOperation({ summary: 'Get rider details by ID' })
  @Get(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async findOne(@Param('id') id: string) {
    return this.ridersService.findOne(id);
  }

  @ApiOperation({
    summary: 'Update rider account status (ACTIVE, SUSPENDED, BANNED)',
  })
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

  @ApiOperation({ summary: 'Verify or reject a rider document' })
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

  @ApiOperation({ summary: "Get rider's delivery/ride history" })
  @Get(':id/rides')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER, UserRole.ADMIN_SUPPORT)
  async getRides(@Param('id') id: string) {
    return this.ridersService.getRiderRides(id);
  }

  @ApiOperation({ summary: 'Override last known location of a rider' })
  @Patch(':id/location')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async updateLocation(
    @Param('id') id: string,
    @Body() body: { lat: number; lng: number },
  ) {
    return this.ridersService.updateLocation(id, body.lat, body.lng);
  }

  @ApiOperation({ summary: 'Update rider name/phone/email' })
  @Patch(':id')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async update(
    @Param('id') id: string,
    @Body() body: { name?: string; phone?: string; email?: string },
  ) {
    return this.ridersService.update(id, body);
  }

  // FINANCE: Wallet & Payouts
  // Strictly Finance Officer & Super Admin
  @ApiOperation({ summary: 'Credit or debit a rider wallet balance' })
  @Post(':id/wallet')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
  async adjustWallet(
    @Param('id') id: string,
    @Body() body: { type: 'CREDIT' | 'DEBIT'; amount: number; reason: string },
    @Req() req: any,
  ) {
    // admin id
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.adjustWallet(
      id,
      body.type,
      body.amount,
      body.reason,
      adminId,
    );
  }

  @ApiOperation({ summary: 'Request a payout for a rider' })
  @Post(':id/payouts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
  async createPayout(
    @Param('id') id: string,
    @Body() body: { amount: number },
  ) {
    return this.ridersService.requestPayout(id, body.amount);
  }

  @ApiOperation({ summary: 'Process (approve/fail) an existing payout' })
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

  @ApiOperation({ summary: 'Delete a rider account (SUPER_ADMIN only)' })
  @Delete(':id')
  @Roles(UserRole.SUPER_ADMIN) // Restrict deletion to Super Admin only
  async remove(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.remove(id, adminId);
  }

  @ApiOperation({ summary: 'Send a direct message to a rider' })
  @Post(':id/message')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async messageRider(
    @Param('id') id: string,
    @Body('message') message: string,
    @Req() req: any,
  ) {
    const adminId = req.user?.id || req.user?.userId;
    return this.ridersService.sendMessageToRider(id, message, adminId);
  }

  @ApiOperation({ summary: "Update a rider's vehicle details" })
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

  @ApiOperation({ summary: "List a rider's payout records" })
  @Get(':id/payouts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN) // Ensure proper authorization
  async getRiderPayouts(@Param('id') id: string) {
    // This calls the service to fetch payouts linked to this specific rider
    return this.ridersService.getRiderPayouts(id);
  }

  @ApiOperation({ summary: 'Suspend or ban a rider (kill-switch)' })
  @Post(':id/kill-switch')
  @Roles(UserRole.SUPER_ADMIN)
  async killSwitch(
    @Param('id') id: string,
    @Body() body: { action: 'SUSPEND' | 'BAN'; reason: string },
    @Req() req: any, // Inject Request to get Admin ID
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
