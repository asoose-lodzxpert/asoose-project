import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ADMIN_ROLES } from '../../auth/decorators/admin-roles.constant';
import { NotificationService } from './notification.service';
import { UpdateNotificationSettingsDto } from '../dto/update-notification-settings.dto';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Rider / Notification Settings')
@ApiBearerAuth()
@Controller({
  path: 'rider/notification',
  version: '1',
})
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @ApiOperation({ summary: 'Get rider push notification settings' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Get('settings')
  async getNotificationSettings(@Req() req) {
    const { id } = req.user || {};
    return this.notificationService.getNotificationSettings(id);
  }

  @ApiOperation({ summary: 'Update rider push notification settings' })
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER, UserRole.DRIVER, ...ADMIN_ROLES)
  @Patch('settings')
  async updateNotificationSettings(
    @Req() req,
    @Body() updateData: UpdateNotificationSettingsDto,
  ) {
    const { id } = req.user || {};
    return this.notificationService.updateNotificationSettings(id, updateData);
  }
}
