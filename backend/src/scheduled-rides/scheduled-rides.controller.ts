import { Controller, Post, Get, Patch, Body, Param, UseGuards, Req, Headers } from '@nestjs/common';
import { ScheduledRidesService } from './scheduled-rides.service';
import { BookScheduledRideDto } from './dto/book-scheduled-ride.dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { ADMIN_ROLES } from '../auth/decorators/admin-roles.constant';

@ApiTags('Scheduled Rides')
@Controller('scheduled-rides')
export class ScheduledRidesController {
  constructor(private readonly scheduledRidesService: ScheduledRidesService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.CUSTOMER, ...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Book a scheduled ride' })
  bookRide(
    @Req() req, 
    @Body() dto: BookScheduledRideDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.scheduledRidesService.bookScheduledRide(dto, req.user.id, idempotencyKey);
  }

  @Get('upcoming')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upcoming scheduled rides for customer' })
  getUpcomingRides(@Req() req) {
    return this.scheduledRidesService.getUpcomingRidesForCustomer(req.user.id);
  }

  @Get('driver/upcoming')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get upcoming scheduled rides for driver' })
  getDriverUpcomingRides(@Req() req) {
    return this.scheduledRidesService.getUpcomingRidesForDriver(req.user.id);
  }

  @Patch(':id/cancel')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Cancel a scheduled ride' })
  cancelRide(@Req() req, @Param('id') id: string) {
    return this.scheduledRidesService.cancelScheduledRide(id, req.user.id);
  }

  @Patch(':id/driver-cancel')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Driver declines an assigned scheduled ride' })
  driverCancelRide(@Req() req, @Param('id') id: string) {
    return this.scheduledRidesService.cancelScheduledRideByDriver(id, req.user.id);
  }

  @Patch(':id/accept')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Driver accepts an assigned scheduled ride and enters active flow' })
  acceptRide(@Req() req, @Param('id') id: string) {
    return this.scheduledRidesService.acceptScheduledRide(id, req.user.id);
  }
}
