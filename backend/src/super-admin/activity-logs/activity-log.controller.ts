import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ActivityLogService } from '../../common/services/activity-log.services';

@Controller('super-admin/activity-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @Get()
  async findAll(@Query() query: any) {
    return this.activityLogService.getLogs(query);
  }
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.activityLogService.findOne(id);
  }
}
