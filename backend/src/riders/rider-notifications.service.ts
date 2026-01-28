import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class RiderNotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    riderId: string,
    type?: string,
    isRead?: boolean,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: any = { riderId };

    if (type) {
      whereClause.type = type.toUpperCase();
    }

    if (isRead !== undefined) {
      whereClause.isRead = isRead;
    }

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        select: {
          id: true,
          title: true,
          message: true,
          type: true,
          category: true,
          isRead: true,
          metadata: true,
          createdAt: true,
        },
      }),
      this.prisma.notification.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit),
        unreadCount: await this.getUnreadCount(riderId),
      },
    };
  }

  async getUnreadCount(riderId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        riderId,
        isRead: false,
      },
    });
  }

  async markAsRead(riderId: string, notificationId: string) {
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { riderId: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.riderId !== riderId) {
      throw new ForbiddenException('Access denied');
    }

    return this.prisma.notification.update({
      where: { id: notificationId },
      data: { isRead: true },
      select: {
        id: true,
        isRead: true,
      },
    });
  }

  async markAllAsRead(riderId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        riderId,
        isRead: false,
      },
      data: { isRead: true },
    });

    return {
      success: true,
      count: result.count,
      message: `Marked ${result.count} notifications as read`,
    };
  }
}
