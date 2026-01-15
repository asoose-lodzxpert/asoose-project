import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class VendorNotificationsService {
  private readonly logger = new Logger(VendorNotificationsService.name);

  constructor(private readonly prisma: PrismaService) {}

  async findAll(
    vendorId: string,
    type?: string,
    isRead?: boolean,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    const whereClause: any = { vendorId };

    // Filter by type (ORDER, PAYOUT, SYSTEM)
    if (type) {
      whereClause.type = type.toUpperCase();
    }

    // Filter by read status
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
        unreadCount: await this.getUnreadCount(vendorId),
      },
    };
  }

  async getUnreadCount(vendorId: string): Promise<number> {
    return this.prisma.notification.count({
      where: {
        vendorId,
        isRead: false,
      },
    });
  }

  async markAsRead(vendorId: string, notificationId: string) {
    // Validate ownership
    const notification = await this.prisma.notification.findUnique({
      where: { id: notificationId },
      select: { vendorId: true },
    });

    if (!notification) {
      throw new NotFoundException('Notification not found');
    }

    if (notification.vendorId !== vendorId) {
      this.logger.warn(
        `Vendor ${vendorId} attempted to access notification ${notificationId} belonging to another vendor`,
      );
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

  async markAllAsRead(vendorId: string) {
    const result = await this.prisma.notification.updateMany({
      where: {
        vendorId,
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
