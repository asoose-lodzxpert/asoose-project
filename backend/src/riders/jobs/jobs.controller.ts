import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { JobsService } from './jobs.service';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Rider / Jobs')
@ApiBearerAuth()
@Controller({
  path: 'rider/jobs',
  version: '1',
})
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({
    summary: 'Get currently active job for rider (ride or delivery)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('active')
  async getActiveJob(@Req() req) {
    const { id: riderId, role } = req.user || {};
    return this.jobsService.getActiveJob(riderId, role);
  }

  @ApiOperation({ summary: 'Accept an incoming job offer' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post(':id/accept')
  async acceptJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.acceptJob(riderId, jobId, jobType);
  }

  @ApiOperation({ summary: 'Decline an incoming job offer' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post(':id/decline')
  async declineJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.declineJob(riderId, jobId, jobType);
  }

  @ApiOperation({ summary: 'Cancel an accepted job with a reason' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post(':id/cancel')
  async cancelJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
    @Body('reason') reason: string,
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.cancelJob(riderId, jobId, jobType, reason);
  }

  @ApiOperation({ summary: 'Signal arrival at pickup location' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post(':id/arrive-pickup')
  async arriveAtPickup(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.arriveAtPickup(riderId, jobId, jobType);
  }

  @ApiOperation({
    summary: 'Confirm passenger/parcel pickup (optionally with OTP)',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post(':id/confirm-pickup')
  async confirmPickup(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
    @Body('otp') otp?: string,
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.confirmPickup(riderId, jobId, jobType, otp);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @ApiOperation({ summary: 'Signal arrival at dropoff location' })
  @Post(':id/arrive-dropoff')
  async arriveAtDropoff(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.arriveAtDropoff(riderId, jobId, jobType);
  }

  @ApiOperation({ summary: 'Verify delivery OTP provided by recipient' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post(':id/verify-otp')
  async verifyDeliveryOtp(
    @Req() req,
    @Param('id') jobId: string,
    @Body('otp') otp: string,
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.verifyDeliveryOtp(riderId, jobId, otp);
  }

  @ApiOperation({ summary: 'Mark a job as complete' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Post(':id/complete')
  async completeJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
    @Body('payload') payload?: any,
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.completeJob(riderId, jobId, jobType, payload);
  }
}
