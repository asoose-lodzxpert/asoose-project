import {
  Controller,
  Get,
  Param,
  Patch,
  Query,
  UseGuards,
  Post,
  Body,
  Req,
} from '@nestjs/common';
import { RideFilterDto } from './dto/ride-filter.dto';
import { RidesService } from './ride.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Rides')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/rides',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  @ApiOperation({ summary: 'List all rides with optional filters' })
  @Get()
  findAll(@Query() query: RideFilterDto) {
    return this.ridesService.findAll(query);
  }

  @ApiOperation({ summary: 'Get ride details by ID' })
  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.ridesService.findOne(id);
  }

  @ApiOperation({ summary: 'Cancel a ride' })
  @Patch(':id/cancel')
  cancel(@Param('id') id: string) {
    return this.ridesService.cancel(id);
  }

  @ApiOperation({ summary: 'Manually assign a driver to a ride' })
  @Post(':id/assign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async assignDriver(
    @Param('id') id: string,
    @Body('riderId') riderId: string,
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.ridesService.manualAssignDriver(id, riderId, adminId);
  }

  @ApiOperation({ summary: 'Force-update a ride status' })
  @Patch(':id/force-status')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async forceStatus(
    @Param('id') id: string,
    @Body() body: { status: string; reason?: string },
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.sub;
    return this.ridesService.forceStatus(
      id,
      body.status as any,
      adminId,
      body.reason,
    );
  }

  @Post(':id/retry-matching')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async retryMatching(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user.id || req.user.sub;
    return this.ridesService.retryMatching(id, adminId);
  }

  @Post(':id/unassign')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN_MANAGER)
  async unassignDriver(@Param('id') id: string, @Req() req: any) {
    const adminId = req.user.id || req.user.sub;
    return this.ridesService.unassignDriver(id, adminId);
  }
}
