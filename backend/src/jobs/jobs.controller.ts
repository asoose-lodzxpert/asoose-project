import { Controller, Post, Body, Param, Req, UseGuards } from '@nestjs/common';
import { Get, Sse, Res } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobType } from './job.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Jobs (Root)')
@ApiBearerAuth()
@Controller({
  path: 'rider/jobs',
  version: '1',
})
export class JobsController {
  constructor(private readonly jobsService: JobsService) {}

  @ApiOperation({
    summary: 'Get currently active job for the authenticated rider/driver',
  })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.RIDER)
  @Get('active')
  async getActiveJob(@Req() req) {
    const { id, role } = req.user;
    return this.jobsService.findActiveJobForUser(id, role);
  }

  @ApiOperation({ summary: 'Accept a job offer' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.RIDER)
  @Post(':id/accept')
  async acceptJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body() body: { jobType: JobType },
  ) {
    // Accept job, update matching and DB
    return this.jobsService.acceptJob(jobId, body.jobType, req.user.id);
  }

  @ApiOperation({ summary: 'Decline a job offer' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.RIDER)
  @Post(':id/decline')
  async declineJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body() body: { jobType: JobType },
  ) {
    // Decline job, update matching and DB
    return this.jobsService.declineJob(jobId, body.jobType, req.user.id);
  }

  @ApiOperation({ summary: 'Signal arrival at pickup location' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.RIDER)
  @Post(':id/arrive-pickup')
  async arrivePickup(
    @Req() req,
    @Param('id') jobId: string,
    @Body() body: { jobType: JobType },
  ) {
    // Arrive at pickup, update matching and DB
    return this.jobsService.arrivePickup(jobId, body.jobType, req.user.id);
  }

  @ApiOperation({ summary: 'Confirm passenger/parcel pickup' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.RIDER)
  @Post(':id/confirm-pickup')
  async confirmPickup(
    @Req() req,
    @Param('id') jobId: string,
    @Body() body: { jobType: JobType },
  ) {
    // Confirm pickup, update matching and DB
    return this.jobsService.confirmPickup(jobId, body.jobType, req.user.id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Signal arrival at dropoff location' })
  @Roles(UserRole.DRIVER, UserRole.RIDER)
  @Post(':id/arrive-dropoff')
  async arriveDropoff(
    @Req() req,
    @Param('id') jobId: string,
    @Body() body: { jobType: JobType },
  ) {
    // Arrive at dropoff, update matching and DB
    return this.jobsService.arriveDropoff(jobId, body.jobType, req.user.id);
  }

  @ApiOperation({ summary: 'Mark a job as complete' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.RIDER)
  @Post(':id/complete')
  async completeJob(
    @Req() req,
    @Param('id') jobId: string,
    @Body() body: { jobType: JobType; payload: any },
  ) {
    // Complete job, update matching and DB
    return this.jobsService.completeJob(jobId, body.jobType, body.payload);
  }
}
