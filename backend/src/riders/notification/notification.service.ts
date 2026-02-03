import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateNotificationSettingsDto } from '../dto/update-notification-settings.dto';

@Injectable()
export class NotificationService {
  constructor(private readonly prisma: PrismaService) {}

  async getNotificationSettings(riderId: string) {
    let settings = await this.prisma.riderNotificationSettings.findUnique({
      where: { riderId },
    });
    if (!settings) {
      settings = await this.prisma.riderNotificationSettings.create({
        data: {
          riderId,
          masterEnabled: true,
          newOrders: true,
          orderUpdates: true,
          vibration: true,
          paymentUpdates: true,
          dailySummary: false,
          weeklySummary: true,
          securityAlerts: true,
        },
      });
    }
    return { settings };
  }

  async updateNotificationSettings(
    riderId: string,
    updateData: UpdateNotificationSettingsDto,
  ) {
    const existingSettings =
      await this.prisma.riderNotificationSettings.findUnique({
        where: { riderId },
      });
    if (!existingSettings) {
      const newSettings = await this.prisma.riderNotificationSettings.create({
        data: {
          riderId,
          masterEnabled: updateData.masterEnabled ?? true,
          newOrders: updateData.newOrders ?? true,
          orderUpdates: updateData.orderUpdates ?? true,
          vibration: updateData.vibration ?? true,
          paymentUpdates: updateData.paymentUpdates ?? true,
          dailySummary: updateData.dailySummary ?? false,
          weeklySummary: updateData.weeklySummary ?? true,
          securityAlerts: updateData.securityAlerts ?? true,
        },
      });
      return {
        message: 'Notification settings created successfully',
        settings: newSettings,
      };
    }
    const updatedSettings = await this.prisma.riderNotificationSettings.update({
      where: { riderId },
      data: {
        ...(updateData.masterEnabled !== undefined && {
          masterEnabled: updateData.masterEnabled,
        }),
        ...(updateData.newOrders !== undefined && {
          newOrders: updateData.newOrders,
        }),
        ...(updateData.orderUpdates !== undefined && {
          orderUpdates: updateData.orderUpdates,
        }),
        ...(updateData.vibration !== undefined && {
          vibration: updateData.vibration,
        }),
        ...(updateData.paymentUpdates !== undefined && {
          paymentUpdates: updateData.paymentUpdates,
        }),
        ...(updateData.dailySummary !== undefined && {
          dailySummary: updateData.dailySummary,
        }),
        ...(updateData.weeklySummary !== undefined && {
          weeklySummary: updateData.weeklySummary,
        }),
        ...(updateData.securityAlerts !== undefined && {
          securityAlerts: updateData.securityAlerts,
        }),
      },
    });
    return {
      message: 'Notification settings updated successfully',
      settings: updatedSettings,
    };
  }
}
