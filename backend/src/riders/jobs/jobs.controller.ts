import { Controller, Post, Param, Body, Req, UseGuards } from '@nestjs/common';
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
}
