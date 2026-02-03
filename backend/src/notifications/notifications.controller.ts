import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  UseGuards,
  Request,
  Query,
} from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  async findAll(@Request() req, @Query('page') page: number) {
    return this.notificationsService.getUserNotifications(
      req.user.userId || req.user.id,
      Number(page) || 1,
    );
  }

  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(
      req.user.userId || req.user.id,
    );
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(
      req.user.userId || req.user.id,
    );
  }

  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(
      req.user.userId || req.user.id,
      id,
    );
  }

  // FIX: Added missing Delete endpoint
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.notificationsService.delete(req.user.userId || req.user.id, id);
  }
}
