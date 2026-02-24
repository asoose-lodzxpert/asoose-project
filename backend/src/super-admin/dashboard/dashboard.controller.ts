import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Dashboard')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/dashboard',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get dashboard KPI stats (orders, revenue, users)' })
  @Get('stats')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getStats(@Request() req) {
    // req.user is now guaranteed to exist
    return this.dashboardService.getStats(req.user);
  }

  @ApiOperation({ summary: 'Get recent activity feed' })
  @Get('activities')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getActivities(@Request() req) {
    return this.dashboardService.getRecentActivity(req.user);
  }

  @ApiOperation({ summary: 'Get active system alerts' })
  @Get('alerts')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async getAlerts(@Request() req) {
    return this.dashboardService.getAlerts(req.user);
  }

  @ApiOperation({ summary: 'Resolve a dashboard alert' })
  @Post('alerts/:id/resolve')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  async resolveAlert(@Param('id') id: string, @Request() req) {
    return this.dashboardService.resolveAlert(id, req.user);
  }

  @ApiOperation({ summary: 'Invalidate the dashboard Redis cache' })
  @Post('cache/invalidate')
  @HttpCode(HttpStatus.OK)
  @Roles(UserRole.SUPER_ADMIN) // strict restriction for cache clearing
  async invalidateCache() {
    await this.dashboardService.invalidateCache();
    return { message: 'Dashboard cache cleared successfully' };
  }
}
