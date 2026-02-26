import { Controller, Get, Post, Body, Query, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/jwt-auth.guard';
import { RolesGuard } from '../../auth/roles.guards';
import { Roles } from '../../auth/roles.decorator';
import { UserRole } from '@prisma/client';
import {
  NoticesService,
  SendNoticeDto,
  MarketingEmailDto,
} from './notices.service';

@ApiTags('Super-Admin / Notices')
@ApiBearerAuth()
@Controller({ path: 'super-admin/notices', version: '1' })
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN)
export class NoticesController {
  constructor(private readonly svc: NoticesService) {}

  /**
   * TEST – fire a push notification to every device on the platform.
   * Useful for smoke-testing FCM/Expo integration.
   */
  @ApiOperation({ summary: '[TEST] Broadcast push to every device' })
  @Get('broadcast/test')
  testBroadcast(
    @Query('title') title = 'Test Notification',
    @Query('message') message = 'This is a test broadcast from Admin.',
  ) {
    return this.svc.testBroadcastAll(title, message);
  }

  /**
   * Send a notification to a SINGLE entity (user / rider / driver / vendor).
   * Body must include `entityId`.
   */
  @ApiOperation({ summary: 'Send push/email to a single entity' })
  @ApiBody({
    schema: {
      example: {
        entityType: 'USER',
        entityId: 'cuid...',
        channels: 'both',
        title: 'Account Update',
        message: 'Your account details have been updated.',
      },
    },
  })
  @Post('send')
  sendToEntity(@Body() dto: SendNoticeDto & { entityId: string }) {
    return this.svc.sendToEntity(dto);
  }

  /**
   * Broadcast a notification to ALL entities of a given type
   * (or every entity on the platform if entityType is omitted).
   */
  @ApiOperation({ summary: 'Broadcast push/email to all of an entity type' })
  @ApiBody({
    schema: {
      example: {
        entityType: 'RIDER', // USER | RIDER | DRIVER | VENDOR
        channels: 'push', // push | email | both
        title: 'New Feature Available',
        message: 'Check out our latest update!',
      },
    },
  })
  @Post('broadcast')
  broadcast(@Body() dto: SendNoticeDto) {
    return this.svc.broadcastToType(dto);
  }

  /**
   * Upload a marketing email template (raw HTML) and distribute it
   * to the specified recipient types.
   */
  @ApiOperation({ summary: 'Broadcast a raw-HTML marketing email' })
  @ApiBody({
    schema: {
      example: {
        subject: 'Big Summer Sale 🎉',
        htmlContent: '<h1>Hello {name}</h1><p>Check our deals!</p>',
        recipientTypes: ['USER', 'VENDOR'],
      },
    },
  })
  @Post('marketing-email')
  marketingEmail(@Body() dto: MarketingEmailDto) {
    return this.svc.broadcastMarketingEmail(dto);
  }
}
