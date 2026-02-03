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
import { RiderNotificationsService } from './rider-notifications.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guards';
import { Roles } from '../auth/roles.decorator';
import { UserRole } from '../common/enums/user-role.enum';

@Controller('rider/notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.RIDER, UserRole.DRIVER)
export class RiderNotificationsController {
  constructor(
    private readonly notificationsService: RiderNotificationsService,
  ) {}

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
    const riderId = req.user.id;
    return this.notificationsService.findAll(
      riderId,
      type,
      isRead === 'true' ? true : isRead === 'false' ? false : undefined,
      Number(page) || 1,
      Number(limit) || 20,
    );
  }

  @Get('unread-count')
  @UseInterceptors(CacheInterceptor)
  @CacheTTL(15) // Cache for 15 seconds
  async getUnreadCount(@Request() req) {
    const riderId = req.user.id;
    return this.notificationsService.getUnreadCount(riderId);
  }

  @Patch(':id/read')
  async markAsRead(@Request() req, @Param('id') id: string) {
    const riderId = req.user.id;
    return this.notificationsService.markAsRead(riderId, id);
  }

  @Patch('read-all')
  async markAllAsRead(@Request() req) {
    const riderId = req.user.id;
    return this.notificationsService.markAllAsRead(riderId);
  }
}
