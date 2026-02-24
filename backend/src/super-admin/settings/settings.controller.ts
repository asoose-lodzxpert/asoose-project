import { Controller, Get, Body, Patch, UseGuards, Req } from '@nestjs/common';
import { SettingsService } from './settings.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Settings')
@ApiBearerAuth()
@Controller({
  path: 'super-admin/settings',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
export class SettingsController {
  constructor(private readonly service: SettingsService) {}

  @ApiOperation({ summary: 'Get all platform system settings' })
  @Get()
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  findAll() {
    return this.service.findAll();
  }

  @ApiOperation({ summary: 'Bulk-update platform settings (SUPER_ADMIN only)' })
  @Patch('bulk')
  @Roles(UserRole.SUPER_ADMIN)
  async updateBulk(
    @Body() body: { settings: { key: string; value: any }[] },
    @Req() req: any,
  ) {
    const adminId = req.user.id || req.user.userId;
    return this.service.updateBulk(body.settings, adminId);
  }
}
