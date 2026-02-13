import { Controller, Get, Patch, Body, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { NotificationService } from './notification.service';
import { UpdateNotificationSettingsDto } from '../dto/update-notification-settings.dto';

@Controller({
  path: 'rider/notification',
  version: '1',
})
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Get('settings')
  async getNotificationSettings(@Req() req) {
    const { id } = req.user || {};
    return this.notificationService.getNotificationSettings(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.RIDER)
  @Patch('settings')
  async updateNotificationSettings(
    @Req() req,
    @Body() updateData: UpdateNotificationSettingsDto,
  ) {
    const { id } = req.user || {};
    return this.notificationService.updateNotificationSettings(id, updateData);
  }
}
