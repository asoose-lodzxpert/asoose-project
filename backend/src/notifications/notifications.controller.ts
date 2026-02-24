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
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller({
  path: 'notifications',
  version: '1',
})
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @ApiOperation({ summary: 'Get paginated notifications for current user' })
  @Get()
  async findAll(@Request() req, @Query('page') page: number) {
    return this.notificationsService.getUserNotifications(
      req.user.userId || req.user.id,
      Number(page) || 1,
    );
  }

  @ApiOperation({ summary: 'Get unread notification count' })
  @Get('unread-count')
  async getUnreadCount(@Request() req) {
    return this.notificationsService.getUnreadCount(
      req.user.userId || req.user.id,
    );
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    return this.notificationsService.markAllAsRead(
      req.user.userId || req.user.id,
    );
  }

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    return this.notificationsService.markAsRead(
      req.user.userId || req.user.id,
      id,
    );
  }

  // FIX: Added missing Delete endpoint
  @ApiOperation({ summary: 'Delete a notification' })
  @Delete(':id')
  async remove(@Request() req, @Param('id') id: string) {
    return this.notificationsService.delete(req.user.userId || req.user.id, id);
  }
}
