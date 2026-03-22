import {
  Controller,
  Get,
  Patch,
  Post,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AdminNotificationsService } from './notifications.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Super-Admin / Notifications')
@ApiBearerAuth()
@Controller({ path: 'super-admin/notifications', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class AdminNotificationsController {
  constructor(private readonly svc: AdminNotificationsService) { }

  @ApiOperation({
    summary: 'List admin notifications (paginated, filterable by type)',
  })
  @Get()
  getAll(
    @Request() req,
    @Query('page') page: string,
    @Query('type') type: string,
  ) {
    return this.svc.getAll(req.user.id, Number(page) || 1, type);
  }

  @ApiOperation({ summary: 'Get unread notification count by type' })
  @Get('unread-count')
  unreadCount(@Request() req, @Query('type') type: string) {
    return this.svc.getUnreadCount(req.user.id, type);
  }

  @ApiOperation({ summary: 'Mark all admin notifications as read' })
  @Patch('read-all')
  markAllAsRead(@Request() req, @Query('type') type: string) {
    return this.svc.markAllAsRead(req.user.id, type);
  }

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.svc.markAsRead(id);
  }

  // ─── Web Push ────────────────────────────────────────────────────────────

  @ApiOperation({
    summary:
      'Send a test push notification to all admins with registered FCM tokens',
  })
  @Post('push/test')
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
  testPush(@Body('title') title?: string, @Body('message') message?: string) {
    return this.svc.testPushToAllAdmins(
      title || '🔔 Test Notification',
      message ||
      'This is a test push notification from the Asoose admin panel.',
    );
  }
}
