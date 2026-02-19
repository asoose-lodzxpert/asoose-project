import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

/** High-priority event types the super-admin monitors */
export const ADMIN_PRIORITY_TYPES = ['ORDER', 'RIDE', 'DELIVERY'];

@Injectable()
export class AdminNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

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
      recipientName:
        user?.name || vendor?.name || rider?.name || '—',
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
}
