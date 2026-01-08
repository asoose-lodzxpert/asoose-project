import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsGateway } from './notifications.gateway'; 

@Injectable()
export class NotificationsService {
  constructor(
    private prisma: PrismaService,
    private notificationsGateway: NotificationsGateway 
  ) {}

  async create(data: {
    userId: string;
    title: string;
    message: string;
    type: string;
    metadata?: any;
  }) {
    const notification = await this.prisma.notification.create({
      data: {
        userId: data.userId,
        title: data.title,
        message: data.message,
        type: data.type,
        metadata: data.metadata || {},
        isRead: false,
      },
    });

    this.notificationsGateway.sendToUser(data.userId, notification);

    return notification;
  }

  async getUserNotifications(userId: string, page = 1) {
    const take = 20;
    const skip = (page - 1) * take;

    const [data, total] = await Promise.all([
      this.prisma.notification.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        take,
        skip,
      }),
      this.prisma.notification.count({ where: { userId } }),
    ]);

    return {
      data,
      meta: { total, page, pages: Math.ceil(total / take) },
    };
  }

  async getUnreadCount(userId: string) {
    const count = await this.prisma.notification.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markAsRead(userId: string, notificationId: string) {
    return this.prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
  
  async markAllAsRead(userId: string) {
    return this.prisma.notification.updateMany({
      where: { userId, isRead: false },
      data: { isRead: true },
    });
  }
}