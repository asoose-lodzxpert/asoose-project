import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('email')
export class EmailProcessor extends WorkerHost {
  constructor(private readonly mailer: MailerService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'send-welcome':
        return this.sendWelcome(job);
      case 'send-vendor-message':
        return this.sendVendorMessage(job);
      case 'order-created-customer':
        return this.sendOrderCreatedCustomer(job);
      case 'order-created-vendor':
        return this.sendOrderCreatedVendor(job);
      case 'vendor-login-notification':
        return this.sendVendorLoginNotification(job);
      case 'vendor-account-created':
        return this.sendVendorAccountCreated(job);
      case 'vendor-password-changed':
        return this.sendVendorPasswordChanged(job);
      case 'vendor-password-reset':
        return this.sendVendorPasswordReset(job);
      case 'vendor-bank-added':
        return this.sendVendorBankAdded(job);
      case 'vendor-withdrawal':
        return this.sendVendorWithdrawal(job);
      case 'vendor-deletion-request':
        return this.sendVendorDeletionRequest(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async sendWelcome(job: Job<{ email: string }>) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: 'Welcome to Asoose! 🎉',
      template: './welcome',
      context: { email: job.data.email },
    });
  }

  private async sendVendorMessage(
    job: Job<{ email: string; subject: string; message: string }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: job.data.subject,
      text: job.data.message,
    });
  }

  private async sendOrderCreatedCustomer(
    job: Job<{ email: string; orderId: string; total: number }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: `Order Confirmed - #${job.data.orderId}`,
      template: './order-confirmation',
      context: {
        orderId: job.data.orderId,
        total: job.data.total,
      },
    });
  }

  private async sendOrderCreatedVendor(
    job: Job<{
      email: string;
      storeName: string;
      orderId: string;
      items: any[];
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: `New Order Alert - #${job.data.orderId}`,
      template: './vendor-new-order',
      context: {
        storeName: job.data.storeName,
        orderId: job.data.orderId,
        items: job.data.items,
      },
    });
  }

  // ========== VENDOR SECURITY NOTIFICATION HANDLERS ==========

  private async sendVendorLoginNotification(
    job: Job<{
      email: string;
      vendorName: string;
      timestamp: string;
      device: string;
      location: string;
      ipAddress: string;
      securityUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🔐 New Login to Your Vendor Account',
      template: 'vendor-login',
      context: {
        vendorName: job.data.vendorName,
        timestamp: job.data.timestamp,
        device: job.data.device,
        location: job.data.location,
        ipAddress: job.data.ipAddress,
        securityUrl: job.data.securityUrl,
        year: job.data.year,
      },
    });
  }

  private async sendVendorAccountCreated(
    job: Job<{
      email: string;
      vendorName: string;
      storeName: string;
      dashboardUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🎉 Welcome to Asoose - Your Vendor Account is Ready!',
      template: 'vendor-account-created',
      context: {
        vendorName: job.data.vendorName,
        storeName: job.data.storeName,
        dashboardUrl: job.data.dashboardUrl,
        year: job.data.year,
      },
    });
  }

  private async sendVendorPasswordChanged(
    job: Job<{
      email: string;
      vendorName: string;
      timestamp: string;
      ipAddress: string;
      securityUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🔒 Your Password Has Been Changed',
      template: 'vendor-password-changed',
      context: {
        vendorName: job.data.vendorName,
        timestamp: job.data.timestamp,
        ipAddress: job.data.ipAddress,
        securityUrl: job.data.securityUrl,
        year: job.data.year,
      },
    });
  }

  private async sendVendorPasswordReset(
    job: Job<{
      email: string;
      vendorName: string;
      resetCode: string;
      resetUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🔑 Password Reset Request',
      template: 'vendor-password-reset',
      context: {
        vendorName: job.data.vendorName,
        resetCode: job.data.resetCode,
        resetUrl: job.data.resetUrl,
        year: job.data.year,
      },
    });
  }

  private async sendVendorBankAdded(
    job: Job<{
      email: string;
      vendorName: string;
      bankName: string;
      maskedAccount: string;
      timestamp: string;
      bankAccountUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🏦 Bank Account Added to Your Profile',
      template: 'vendor-bank-added',
      context: {
        vendorName: job.data.vendorName,
        bankName: job.data.bankName,
        maskedAccount: job.data.maskedAccount,
        timestamp: job.data.timestamp,
        bankAccountUrl: job.data.bankAccountUrl,
        year: job.data.year,
      },
    });
  }

  private async sendVendorWithdrawal(
    job: Job<{
      email: string;
      vendorName: string;
      amount: string;
      bankName: string;
      maskedAccount: string;
      timestamp: string;
      withdrawalsUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '💸 Withdrawal Request Received',
      template: 'vendor-withdrawal',
      context: {
        vendorName: job.data.vendorName,
        amount: job.data.amount,
        bankName: job.data.bankName,
        maskedAccount: job.data.maskedAccount,
        timestamp: job.data.timestamp,
        withdrawalsUrl: job.data.withdrawalsUrl,
        year: job.data.year,
      },
    });
  }

  private async sendVendorDeletionRequest(
    job: Job<{
      email: string;
      vendorName: string;
      supportUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '⚠️ Account Deletion Request Received',
      template: 'vendor-deletion-request',
      context: {
        vendorName: job.data.vendorName,
        supportUrl: job.data.supportUrl,
        year: job.data.year,
      },
    });
  }
}
