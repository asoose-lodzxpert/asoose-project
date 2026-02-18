import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProducer } from '../../mail/email.producer';
import { NotificationsService } from '../../notifications/notifications.service';
import { NotificationPreferenceService } from '../../common/services/notification-preference.service';

/**
 * User Account Status Notifications Service
 * Handles notifications for account suspension/activation and dispute/support responses
 */
@Injectable()
export class UserAccountNotificationsService {
  private readonly logger = new Logger(UserAccountNotificationsService.name);

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
    private notificationsService: NotificationsService,
    private prefService: NotificationPreferenceService,
  ) {}

  /**
   * Notify user when their account status changes (suspended, activated, banned, etc.)
   */
  async notifyAccountStatusChange(
    userId: string,
    newStatus: 'ACTIVE' | 'SUSPENDED' | 'BANNED' | 'INACTIVE',
    reason?: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) return;

      // Check if user allows security alerts
      const allowNotification = await this.prefService.canNotifyUser(
        userId,
        'security',
      );
      if (!allowNotification) return;

      const statusMessage = {
        ACTIVE: 'activated',
        SUSPENDED: 'suspended',
        BANNED: 'banned',
        INACTIVE: 'deactivated',
      }[newStatus];

      const title = `Account ${statusMessage}`;
      const message =
        newStatus === 'ACTIVE'
          ? `Your account has been ${statusMessage}. You can now place orders and use all platform features.`
          : `Your account has been ${statusMessage}.${reason ? ` Reason: ${reason}` : ''}`;

      // Create in-app notification
      await this.notificationsService.create({
        userId,
        title,
        message,
        type: 'SECURITY',
        category: 'ACCOUNT_STATUS_CHANGED',
        metadata: {
          newStatus,
          reason,
          timestamp: new Date().toISOString(),
        },
      });

      // Send email notification using template
      await this.emailProducer.sendCustomerAccountStatusNotification(
        user.email,
        user.name,
        newStatus,
        reason || `Your account has been ${statusMessage}.`,
      );

      this.logger.log(
        `Account status change notification sent to user ${userId}`,
      );
    } catch (error) {
      this.logger.error(
        `Failed to send account status notification for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Notify user when admin responds to their dispute or support ticket
   */
  async notifyDisputeResponse(
    userId: string,
    disputeId: string,
    adminMessage: string,
    resolution: 'RESOLVED' | 'PENDING' | 'ESCALATED',
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) return;

      // Check if user allows order/dispute notifications
      const allowNotification = await this.prefService.canNotifyUser(
        userId,
        'orders',
      );
      if (!allowNotification) return;

      const resolutionMessage = {
        RESOLVED: 'Your dispute has been resolved',
        PENDING: 'Your dispute is being reviewed',
        ESCALATED: 'Your dispute has been escalated for further review',
      }[resolution];

      const title = `Dispute Update: ${resolutionMessage}`;
      const message =
        adminMessage ||
        `${resolutionMessage}. Please check your account for details.`;

      // Create in-app notification
      await this.notificationsService.create({
        userId,
        title,
        message,
        type: 'SYSTEM',
        category: 'DISPUTE_RESPONSE',
        metadata: {
          disputeId,
          resolution,
          timestamp: new Date().toISOString(),
        },
      });

      // Send email notification
      const emailContent = `Hello ${user.name},\n\n${resolutionMessage}.\n\nMessage from our support team:\n${adminMessage}\n\nPlease log in to your account to view more details.\n\nBest regards,\nThe Asoose Support Team`;

      await this.emailProducer.sendUserMessage(
        user.email,
        `Dispute Update: ${resolutionMessage}`,
        emailContent,
      );

      this.logger.log(`Dispute response notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send dispute response notification for user ${userId}:`,
        error,
      );
    }
  }

  /**
   * Notify user when there's a response to their support inquiry
   */
  async notifySupportResponse(
    userId: string,
    ticketId: string,
    subject: string,
    responseMessage: string,
  ) {
    try {
      const user = await this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true },
      });

      if (!user) return;

      // Check if user allows notifications
      const allowNotification = await this.prefService.canNotifyUser(
        userId,
        'all',
      );
      if (!allowNotification) return;

      const title = `Support Response: ${subject}`;
      const message = `Our support team has responded to your inquiry. Please check the details.`;

      // Create in-app notification
      await this.notificationsService.create({
        userId,
        title,
        message,
        type: 'SYSTEM',
        category: 'SUPPORT_RESPONSE',
        metadata: {
          ticketId,
          subject,
          timestamp: new Date().toISOString(),
        },
      });

      // Send email notification
      const emailContent = `Hello ${user.name},\n\nWe have responded to your support inquiry with subject:\n"${subject}"\n\nResponse:\n${responseMessage}\n\nIf you have further questions, please reply to this email.\n\nBest regards,\nThe Asoose Support Team`;

      await this.emailProducer.sendUserMessage(
        user.email,
        `Support Response: ${subject}`,
        emailContent,
      );

      this.logger.log(`Support response notification sent to user ${userId}`);
    } catch (error) {
      this.logger.error(
        `Failed to send support response notification for user ${userId}:`,
        error,
      );
    }
  }
}
