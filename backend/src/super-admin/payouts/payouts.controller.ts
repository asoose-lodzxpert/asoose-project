import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';

@Controller({
  path: 'super-admin/payouts',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @Get('pending')
  getPending() {
    return this.payoutsService.getPendingPayouts();
  }

  @Post(':type/:id/approve')
  approve(
    @Param('id') id: string,
    @Param('type') type: 'VENDOR' | 'RIDER',
    @Request() req,
  ) {
    return this.payoutsService.approvePayout(id, type, req.user.id);
  }

  @Post(':type/:id/reject')
  reject(
    @Param('id') id: string,
    @Param('type') type: 'VENDOR' | 'RIDER',
    @Body('reason') reason: string,
    @Request() req,
  ) {
    // ✅ Updated: Pass req.user.id as the 4th argument
    return this.payoutsService.rejectPayout(id, type, reason, req.user.id);
  }
}