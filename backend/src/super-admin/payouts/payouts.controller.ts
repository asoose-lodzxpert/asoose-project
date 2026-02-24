import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { PayoutsService } from './payouts.service';
import { UserRole } from '@prisma/client';
import { JwtAuthGuard } from 'src/auth/jwt-auth.guard';
import { RolesGuard } from 'src/auth/roles.guards';
import { Roles } from 'src/auth/roles.decorator';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Payouts')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/payouts',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_FINANCE)
export class PayoutsController {
  constructor(private readonly payoutsService: PayoutsService) {}

  @ApiOperation({
    summary: 'Get all payouts with optional status/type/date filters',
  })
  @Get()
  getAll(
    @Query('status') status?: string,
    @Query('type') type?: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    return this.payoutsService.getPayouts({ status, type, from, to });
  }

  @ApiOperation({ summary: 'Get all pending (awaiting approval) payouts' })
  @Get('pending')
  getPending() {
    return this.payoutsService.getPendingPayouts();
  }

  @ApiOperation({ summary: 'Approve a payout for a vendor or rider' })
  @Post(':type/:id/approve')
  approve(
    @Param('id') id: string,
    @Param('type') type: 'VENDOR' | 'RIDER',
    @Request() req,
  ) {
    return this.payoutsService.approvePayout(id, type, req.user.id);
  }

  @ApiOperation({ summary: 'Reject a payout with reason' })
  @Post(':type/:id/reject')
  reject(
    @Param('id') id: string,
    @Param('type') type: 'VENDOR' | 'RIDER',
    @Body('reason') reason: string,
    @Request() req,
  ) {
    return this.payoutsService.rejectPayout(id, type, reason, req.user.id);
  }
}
