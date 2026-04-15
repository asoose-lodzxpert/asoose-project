import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { ExpoPushService } from '../libs/expo/expo-push.service';
import { FcmService } from '../libs/fcm/fcm.service';
import { EmailProducer } from '../mail/email.producer';

export enum AdminEventSeverity {
  LOW = 'LOW', // Only in-app WS broadcast
  NORMAL = 'NORMAL', // In-app + DB logs + Push
  CRITICAL = 'CRITICAL', // In-app + DB logs + Push + Email
}

export interface AdminActionEvent {
  action: string;
  severity: AdminEventSeverity;
  title: string;
  message: string;
  metadata?: any;
}

@Injectable()
export class AdminAuditService {
  private readonly logger = new Logger(AdminAuditService.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private expoPushService: ExpoPushService,
    private fcmService: FcmService,
    private emailProducer: EmailProducer,
  ) {}

  /**
   * Universal listener that catches all explicitly fired 'system.action' events.
   */
  @OnEvent('system.action', { async: true })
  async handleSystemAction(payload: AdminActionEvent) {
    this.logger.debug(
      `Captured Action: ${payload.action} [${payload.severity}]`,
    );

    try {
      // 1. Low severity: Just broadcast natively (no DB persistent saving required for spam)
      if (payload.severity === AdminEventSeverity.LOW) {
        // We can manually send to websocket room without DB persistence if we want, OR
        // bypass it entirely because low means it's tracked in dedicated tables, but
        // for "every action", let's store it with createForAdmin directly.
      }

      // 2. We will save ALL actions (even LOW) if the client really wants "every single action" routed.
      // Doing DB logging for everything by default.
      await this.notificationsService.createForAdmin({
        title: payload.title,
        message: payload.message,
        type: 'SYSTEM',
        category: payload.action,
        metadata: payload.metadata,
      });

      // 3. For NORMAL & CRITICAL: Dispatch Push Notifications to all admins
      if (
        payload.severity === AdminEventSeverity.NORMAL ||
        payload.severity === AdminEventSeverity.CRITICAL
      ) {
        await this.dispatchPushToAdmins(payload);
      }

      // 4. For CRITICAL: Dispatch Emails to all admins
      if (payload.severity === AdminEventSeverity.CRITICAL) {
        await this.dispatchEmailsToAdmins(payload);
      }
    } catch (error) {
      this.logger.error(
        `Failed to handle system.action: ${payload.action}`,
        error,
      );
    }
  }

  /**
   * Find roles designated as super admins and fetch their tokens for pushes
   */
  private async dispatchPushToAdmins(payload: AdminActionEvent) {
    const adminTokens = await this.prisma.pushToken.findMany({
      where: {
        user: {
          role: { in: ['SUPER_ADMIN', 'ADMIN_MANAGER', 'ADMIN_SUPPORT'] },
          status: 'ACTIVE',
        },
      },
      select: { token: true, platform: true },
    });

    for (const t of adminTokens) {
      try {
        const isExpo = t.platform === 'expo' || t.token.startsWith('ExponentPushToken[');
        if (isExpo) {
          await this.expoPushService.sendToDevice(
            t.token,
            payload.title,
            payload.message,
            payload.metadata,
            'default',
          );
        } else {
          await this.fcmService.sendToDevice(
            t.token,
            payload.title,
            payload.message,
            payload.metadata,
          );
        }
      } catch (err: any) {
        this.logger.warn(`Failed push to an admin device: ${err.message}`);
      }
    }
  }

  /**
   * Find all admins and dispatch emails for critical payloads
   */
  private async dispatchEmailsToAdmins(payload: AdminActionEvent) {
    const adminEmailsSql: { email: string }[] = await this.prisma.user.findMany(
      {
        where: {
          role: 'SUPER_ADMIN', // Only true super-admins for critical emails
          status: 'ACTIVE',
        },
        select: { email: true },
      },
    );

    if (adminEmailsSql.length === 0) return;

    // Join comma separated emails to bulk dispatch via MailProducer
    const adminEmailAddresses = adminEmailsSql.map((u) => u.email).join(',');

    await this.emailProducer.sendAdminAlert(
      adminEmailAddresses,
      `CRITICAL ALERT: ${payload.title}`,
      `${payload.message}\n\nMetadata Context:\n${JSON.stringify(payload.metadata, null, 2)}`,
    );
  }
}
