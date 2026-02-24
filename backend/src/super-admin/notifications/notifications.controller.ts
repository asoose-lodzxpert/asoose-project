import {
  Controller,
  Get,
  Patch,
  Param,
  Query,
  UseGuards,
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
  constructor(private readonly svc: AdminNotificationsService) {}

  @ApiOperation({
    summary: 'List admin notifications (paginated, filterable by type)',
  })
  @Get()
  getAll(@Query('page') page: string, @Query('type') type: string) {
    return this.svc.getAll(Number(page) || 1, type);
  }

  @ApiOperation({ summary: 'Get unread notification count by type' })
  @Get('unread-count')
  unreadCount(@Query('type') type: string) {
    return this.svc.getUnreadCount(type);
  }

  @ApiOperation({ summary: 'Mark all admin notifications as read' })
  @Patch('read-all')
  markAllAsRead(@Query('type') type: string) {
    return this.svc.markAllAsRead(type);
  }

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @Patch(':id/read')
  markAsRead(@Param('id') id: string) {
    return this.svc.markAsRead(id);
  }
}
