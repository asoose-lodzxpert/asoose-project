import { Controller, Get, Patch, Param, UseGuards, Request, Query } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req, @Query('page') page: number) {
    // Matches the renamed service method
    return this.notificationsService.getUserNotifications(req.user.userId || req.user.id, Number(page) || 1);
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    // Matches the new service method
    return this.notificationsService.getUnreadCount(req.user.userId || req.user.id);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    // Correctly calls markAllAsRead with just userId
    return this.notificationsService.markAllAsRead(req.user.userId || req.user.id);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    // Correctly passes both arguments: userId AND notificationId
    return this.notificationsService.markAsRead(req.user.userId || req.user.id, id);
  }
}