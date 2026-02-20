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
import { JobsService } from './jobs.service';

@Controller({
  path: 'rider/jobs',
  version: '1',
})
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  /**
   * GET /rider/jobs/active
   * Returns the currently assigned/active job for the authenticated rider or driver.
   * Used by the rider app to restore UI state after app restart or reconnect.
   */
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Get('active')
  async getActiveJob(@Req() req) {
    const { id: riderId, role } = req.user || {};
    return this.jobsService.getActiveJob(riderId, role);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post(':id/accept')
  async acceptJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.acceptJob(riderId, jobId, jobType);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post(':id/decline')
  async declineJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.declineJob(riderId, jobId, jobType);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
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

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post(':id/arrive-pickup')
  async arriveAtPickup(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.arriveAtPickup(riderId, jobId, jobType);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post(':id/confirm-pickup')
  async confirmPickup(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.confirmPickup(riderId, jobId, jobType);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post(':id/arrive-dropoff')
  async arriveAtDropoff(
    @Req() req,
    @Param('id') jobId: string,
    @Body('jobType') jobType: 'ride' | 'delivery',
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.arriveAtDropoff(riderId, jobId, jobType);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
  @Post(':id/verify-otp')
  async verifyDeliveryOtp(
    @Req() req,
    @Param('id') jobId: string,
    @Body('otp') otp: string,
  ) {
    const { id: riderId } = req.user || {};
    return this.jobsService.verifyDeliveryOtp(riderId, jobId, otp);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER)
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
