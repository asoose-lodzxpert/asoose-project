import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { FcmService } from 'src/libs/fcm/fcm.service';
import { UserRole } from '@prisma/client';

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
  ) {}

  async getAll(page = 1, type?: string) {
    const take = 25;
    const skip = (page - 1) * take;

    const typeFilter =
      type && type.toUpperCase() !== 'ALL'
        ? [type.toUpperCase()]
        : ADMIN_PRIORITY_TYPES;

    const where = { type: { in: typeFilter } };

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

  async getUnreadCount(type?: string) {
    const typeFilter =
      type && type.toUpperCase() !== 'ALL'
        ? [type.toUpperCase()]
        : ADMIN_PRIORITY_TYPES;

    const count = await this.prisma.notification.count({
      where: { type: { in: typeFilter }, isRead: false },
    });

    return { count };
  }

  async markAsRead(id: string) {
    return this.prisma.notification.update({
      where: { id },
      data: { isRead: true },
    });
  }

  async markAllAsRead(type?: string) {
    const typeFilter =
      type && type.toUpperCase() !== 'ALL'
        ? [type.toUpperCase()]
        : ADMIN_PRIORITY_TYPES;

    return this.prisma.notification.updateMany({
      where: { type: { in: typeFilter }, isRead: false },
      data: { isRead: true },
    });
  }

  // ─── Web Push ────────────────────────────────────────────────────────────

  /**
   * Send a test FCM push notification to every admin user that has
   * registered a web/device push token.
   */
  async testPushToAllAdmins(title: string, message: string) {
    const admins = await this.prisma.user.findMany({
      where: {
        role: { in: ADMIN_ROLES },
        fcmToken: { not: null },
        status: 'ACTIVE',
      },
      select: { id: true, name: true, fcmToken: true, role: true },
    });

    const tokens = admins.map((a) => a.fcmToken!).filter(Boolean);

    if (!tokens.length) {
      return {
        success: false,
        adminsFound: admins.length,
        tokensFound: 0,
        message:
          'No admin push tokens registered. Open the admin panel in a browser ' +
          'that has granted notification permission to register a token.',
      };
    }

    await this.fcm.sendToDevices(tokens, title, message, {
      type: 'ADMIN_TEST',
      url: '/super-admin/notifications',
      sound: 'notification',
    });

    this.logger.log(
      `Test push sent to ${tokens.length} admin device(s) (${admins.map((a) => a.name).join(', ')})`,
    );

    return {
      success: true,
      adminsFound: admins.length,
      tokensFound: tokens.length,
      recipients: admins.map((a) => ({ id: a.id, name: a.name, role: a.role })),
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
    const tokens = await this.prisma.user
      .findMany({
        where: {
          role: { in: ADMIN_ROLES },
          fcmToken: { not: null },
          status: 'ACTIVE',
        },
        select: { fcmToken: true },
      })
      .then((rows) => rows.map((r) => r.fcmToken!).filter(Boolean));

    if (tokens.length) {
      await this.fcm.sendToDevices(tokens, title, body, data);
    }

    return tokens.length;
  }
}
