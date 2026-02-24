import { Controller, Get, Query, UseGuards, Param } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ActivityLogService } from '../../common/services/activity-log.services';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Activity Logs')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/activity-logs',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN)
export class ActivityLogController {
  constructor(private readonly activityLogService: ActivityLogService) {}

  @ApiOperation({
    summary: 'List all admin activity logs with optional filters',
  })
  @Get()
  async findAll(@Query() query: any) {
    return this.activityLogService.getLogs(query);
  }
  @ApiOperation({ summary: 'Get a single activity log entry by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    return this.activityLogService.findOne(id);
  }
}
