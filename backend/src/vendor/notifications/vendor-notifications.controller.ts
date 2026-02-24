import {
  Controller,
  Get,
  Patch,
  Param,
  UseGuards,
  Request,
  Query,
  UseInterceptors,
} from '@nestjs/common';
import { CacheInterceptor, CacheTTL } from '@nestjs/cache-manager';
import { VendorNotificationsService } from './vendor-notifications.service';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '../../common/enums/user-role.enum';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Vendor / Notifications')
@ApiBearerAuth()
@Controller({
  path: 'vendor/notifications',
  version: '1',
})
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.VENDOR)
export class VendorNotificationsController {
  constructor(
    private readonly notificationsService: VendorNotificationsService,
  ) {}

  @ApiOperation({
    summary:
      'Get vendor notifications with optional type/read filters (paginated)',
  })
  @Get()
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(30) // Cache for 30 seconds
  async findAll(
    @Request() req,
    @Query('type') type?: string,
    @Query('isRead') isRead?: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const vendorId = req.user.id;
    return this.notificationsService.findAll(
      vendorId,
      type,
      isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @ApiOperation({ summary: 'Get count of unread notifications' })
  @Get('unread-count')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15) // Cache for 15 seconds
  async getUnreadCount(@Request() req) {
    const vendorId = req.user.id;
    return this.notificationsService.getUnreadCount(vendorId);
  }

  @ApiOperation({ summary: 'Mark a single notification as read' })
  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    const vendorId = req.user.id;
    return this.notificationsService.markAsRead(vendorId, id);
  }

  @ApiOperation({ summary: 'Mark all notifications as read' })
  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const vendorId = req.user.id;
    return this.notificationsService.markAllAsRead(vendorId);
  }
}
