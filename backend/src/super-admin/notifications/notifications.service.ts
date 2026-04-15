import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FcmService } from 'src/libs/fcm/fcm.service';
import { UserRole } from '@prisma/client';
import { ExpoPushService } from 'src/libs/expo/expo-push.service';

/** High-priority event types the super-admin monitors */
export const ADMIN_PRIORITY_TYPES = ['ORDER', 'RIDE', 'DELIVERY'];

const ADMIN_ROLES: UserRole[] = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.ADMIN_MANAGER,
  UserRole.ADMIN_SUPPORT,
  UserRole.ADMIN_FINANCE,
];

@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly fcm: FcmService,
    private readonly expo: ExpoPushService,
  ) { }

  async getAll(adminId: string, page = 1, type?: string) {
    const take = 25;
    const skip = (page - 1) * take;

    const where: any = {};

    const adminUsers = await this.prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u) => u.id);

    where.OR = [
      { userId: null, vendorId: null, riderId: null }, // System alerts
      { userId: { in: adminIds } },                    // Alerts explicitly sent to ANY admin
    ];

    if (type && type.toUpperCase() !== 'ALL') {
      where.type = type.toUpperCase();
    }

    const [rawData, total] = await Promise.all([
      this.prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take,
        skip,
        include: {
          user: { select: { name: true, email: true } },
          vendor: { select: { name: true } },
          rider: { select: { name: true } },
        },
      }),
      this.prisma.notification.count({ where }),
    ]);

    const data = rawData.map(({ user, vendor, rider, ...n }) => ({
      ...n,
      recipientName: user?.name || vendor?.name || rider?.name || '—',
      recipientEmail: user?.email || null,
    }));

    return {
      data,
      meta: { total, page, pages: Math.ceil(total / take) },
    };
  }

  async getUnreadCount(adminId: string, type?: string) {
    const where: any = { isRead: false };

    const adminUsers = await this.prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u) => u.id);

    where.OR = [
      { userId: null, vendorId: null, riderId: null },
      { userId: { in: adminIds } },
    ];

    if (type && type.toUpperCase() !== 'ALL') {
      where.type = type.toUpperCase();
    }

    const count = await this.prisma.notification.count({ where });

    return { count };
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(adminId: string, type?: string) {
    const where: any = { isRead: false };

    const adminUsers = await this.prisma.user.findMany({
      where: { role: { in: ADMIN_ROLES } },
      select: { id: true },
    });
    const adminIds = adminUsers.map((u) => u.id);

    where.OR = [
      { userId: null, vendorId: null, riderId: null },
      { userId: { in: adminIds } },
    ];

    if (type && type.toUpperCase() !== 'ALL') {
      where.type = type.toUpperCase();
    }

    return this.prisma.notification.updateMany({
      where,
      data: { isRead: true },
    });
  }

  // ─── Web Push ────────────────────────────────────────────────────────────

  /**
   * Send a test FCM push notification to every admin user that has
   * registered a web/device push token.
   */
  async testPushToAllAdmins(title: string, message: string) {
    const adminTokens = await this.prisma.pushToken.findMany({
      where: {
        user: {
          role: { in: ADMIN_ROLES },
          status: 'ACTIVE',
        },
      },
      select: {
        token: true,
        platform: true,
        user: { select: { id: true, name: true, role: true } },
      },
    });

    if (!adminTokens.length) {
      return {
        success: false,
        tokensFound: 0,
        message: 'No admin push tokens registered.',
      };
    }

    const data = {
      type: 'ADMIN_TEST',
      url: '/super-admin/notifications',
      sound: 'notification',
    };

    await this._sendPushToTokens(adminTokens, title, message, data);

    const recipients = Array.from(new Set(adminTokens.map(t => t.user?.id).filter(Boolean)))
      .map(id => {
        const t = adminTokens.find(at => at.user?.id === id);
        return { id, name: t?.user?.name, role: t?.user?.role };
      });

    return {
      success: true,
      tokensFound: adminTokens.length,
      recipients,
    };
  }

  /**
   * Broadcast a real event push to all admins (called internally on new orders etc.).
   */
  async broadcastToAdmins(
    title: string,
    body: string,
    data?: Record<string, string>,
  ) {
    const tokens = await this.prisma.pushToken.findMany({
      where: {
        user: {
          role: { in: ADMIN_ROLES },
          status: 'ACTIVE',
        },
      },
      select: { token: true, platform: true },
    });

    if (tokens.length) {
      await this._sendPushToTokens(tokens, title, body, data);
    }

    return tokens.length;
  }

  private async _sendPushToTokens(
    tokens: { token: string; platform: string }[],
    title: string,
    message: string,
    metadata?: any,
  ) {
    const expoTokens = tokens
      .filter(t => t.platform === 'expo' || t.token.startsWith('ExponentPushToken['))
      .map(t => t.token);
    const fcmTokens = tokens
      .filter(t => t.platform !== 'expo' && !t.token.startsWith('ExponentPushToken['))
      .map(t => t.token);

    if (expoTokens.length > 0) {
      await this.expo.sendToMultipleDevices(expoTokens, title, message, metadata).catch(e => this.logger.error('Expo push error', e));
    }
    if (fcmTokens.length > 0) {
      await this.fcm.sendToDevices(fcmTokens, title, message, metadata).catch(e => this.logger.error('FCM push error', e));
    }
  }
}
