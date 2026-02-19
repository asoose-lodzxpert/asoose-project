import { Controller, Get, Patch, Param, Query, UseGuards } from '@nestjs/common';
import { AdminNotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller({ path: 'super-admin/notifications', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminNotificationsController {
  constructor(private readonly svc: AdminNotificationsService) {}

  /** GET /api/v1/super-admin/notifications?page=1&type=ORDER */
  @Get()
  getAll(
    @Query('page') page: string,
    @Query('type') type: string,
  ) {
    return this.svc.getAll(Number(page) || 1, type);
  }

  /** GET /api/v1/super-admin/notifications/unread-count?type=ORDER */
  @Get('unread-count')
  unreadCount(@Query('type') type: string) {
    return this.svc.getUnreadCount(type);
  }

  /** PATCH /api/v1/super-admin/notifications/read-all?type=ORDER */
  @Patch('read-all')
  markAllAsRead(@Query('type') type: string) {
    return this.svc.markAllAsRead(type);
  }

  /** PATCH /api/v1/super-admin/notifications/:id/read */
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.svc.markAsRead(id);
  }
}
