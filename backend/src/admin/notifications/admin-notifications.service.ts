import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { EmailProducer } from '../../mail/email.producer';
import { AppLogger } from '../../libs/logger/app-logger.service';

/**
 * Admin Notifications Service
 * Handles notifications to admin for critical events (high-value withdrawals, failed jobs, etc.)
 */
@Injectable()
export class AdminNotificationsService {
  private readonly logger = new Logger(AdminNotificationsService.name);
  private readonly HIGH_VALUE_WITHDRAWAL_THRESHOLD = 1000000; // 1 million naira

  constructor(
    private prisma: PrismaService,
    private emailProducer: EmailProducer,
    private appLogger: AppLogger,
  ) {}

  /**
   * Notify admin of high-value withdrawal request for audit/compliance
   */
  async notifyHighValueWithdrawal(
    entityType: 'VENDOR' | 'RIDER',
    entityId: string,
    amount: number,
    bankDetails?: {
      bankName: string;
      accountNumber: string;
      accountName: string;
    },
  ) {
    try {
      if (amount < this.HIGH_VALUE_WITHDRAWAL_THRESHOLD) return;

      // Get entity name
      let entityName = 'Unknown';
      if (entityType === 'VENDOR') {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: entityId },
          select: { name: true },
        });
        entityName = vendor?.name || 'Unknown Vendor';
      } else {
        const rider = await this.prisma.rider.findUnique({
          where: { id: entityId },
          select: { name: true },
        });
        entityName = rider?.name || 'Unknown Rider';
      }

      // Get admin emails (assuming there's an admin list)
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      });

      if (admins.length === 0) {
        this.logger.warn('No admin emails found for withdrawal notification');
        return;
      }

      const adminEmails = admins.map((a) => a.email).join(', ');

      // Send email notification using template
      await this.emailProducer.sendAdminHighValueWithdrawalAlert(
        adminEmails,
        entityType,
        amount,
        bankDetails?.accountName || 'Account',
        bankDetails?.accountNumber || '****',
        bankDetails?.bankName || 'N/A',
      );

      this.logger.log(
        `High-value withdrawal alert sent to admins for ${entityType} ${entityId}`,
      );
    } catch (error) {
      this.appLogger.error(
        `Failed to send high-value withdrawal notification:`,
        error?.stack,
        { error },
      );
    }
  }

  /**
   * Notify admin of critical system errors or failed background jobs
   */
  async notifyCriticalSystemError(
    errorType: string,
    errorMessage: string,
    context?: Record<string, any>,
  ) {
    try {
      // Get admin emails
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      });

      if (admins.length === 0) {
        this.logger.warn('No admin emails found for error notification');
        return;
      }

      const adminEmails = admins.map((a) => a.email).join(', ');
      const subject = `🚨 CRITICAL SYSTEM ERROR: ${errorType}`;
      const message = `A critical system error has occurred:\n\n
Error Type: ${errorType}\n
Message: ${errorMessage}\n
${context ? `Additional Context:\n${JSON.stringify(context, null, 2)}\n` : ''}
Timestamp: ${new Date().toLocaleString()}\n\n
Please investigate and take appropriate action.
For urgent issues, contact the development team immediately.`;

      await this.emailProducer.sendAdminAlert(adminEmails, subject, message);

      this.logger.log(
        `Critical system error notification sent to admins for ${errorType}`,
      );
    } catch (error) {
      this.appLogger.error(
        `Failed to send critical error notification:`,
        error?.stack,
        { error },
      );
    }
  }

  /**
   * Notify admin of failed background job for monitoring
   */
  async notifyFailedBackgroundJob(
    jobName: string,
    failureReason: string,
    retryCount: number,
  ) {
    try {
      // Get admin emails
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      });

      if (admins.length === 0) return;

      const adminEmails = admins.map((a) => a.email).join(', ');
      const subject = `❌ BACKGROUND JOB FAILED: ${jobName}`;
      const message = `A background job has failed:\n\n
Job Name: ${jobName}\n
Failure Reason: ${failureReason}\n
Retry Count: ${retryCount}\n
Timestamp: ${new Date().toLocaleString()}\n\n
Please check the logs and investigate if further action is needed.`;

      await this.emailProducer.sendAdminAlert(adminEmails, subject, message);

      this.logger.log(
        `Background job failure notification sent to admins for ${jobName}`,
      );
    } catch (error) {
      this.appLogger.error(
        `Failed to send background job failure notification:`,
        error?.stack,
        { error },
      );
    }
  }

  /**
   * Notify admin of unusual activity pattern for security monitoring
   */
  async notifyUnusualActivity(
    activityType: string,
    entityType: 'USER' | 'VENDOR' | 'RIDER',
    entityId: string,
    description: string,
  ) {
    try {
      // Get admin emails
      const admins = await this.prisma.user.findMany({
        where: { role: 'ADMIN' },
        select: { email: true },
      });

      if (admins.length === 0) return;

      const adminEmails = admins.map((a) => a.email).join(', ');
      const subject = `⚠️ UNUSUAL ACTIVITY DETECTED: ${activityType}`;
      const message = `An unusual activity pattern has been detected:\n\n
Activity Type: ${activityType}\n
Entity Type: ${entityType}\n
Entity ID: ${entityId}\n
Description: ${description}\n
Timestamp: ${new Date().toLocaleString()}\n\n
Please review this activity for potential security concerns.`;

      await this.emailProducer.sendAdminAlert(adminEmails, subject, message);

      this.logger.log(
        `Unusual activity notification sent to admins for ${entityType} ${entityId}`,
      );
    } catch (error) {
      this.appLogger.error(
        `Failed to send unusual activity notification:`,
        error?.stack,
        { error },
      );
    }
  }
}
