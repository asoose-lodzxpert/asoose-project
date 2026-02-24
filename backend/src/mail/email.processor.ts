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
      case 'send-user-message':
        return this.sendUserMessage(job);
      case 'send-rider-message':
        return this.sendRiderMessage(job);
      case 'admin-alert':
        return this.sendAdminAlert(job);
      case 'vendor-store-status':
        return this.sendVendorStoreStatus(job);
      case 'vendor-product-status':
        return this.sendVendorProductStatus(job);
      case 'rider-account-status':
        return this.sendRiderAccountStatus(job);
      case 'rider-document-verification':
        return this.sendRiderDocumentVerification(job);
      case 'customer-account-status':
        return this.sendCustomerAccountStatus(job);
      case 'admin-high-value-withdrawal':
        return this.sendAdminHighValueWithdrawal(job);
      case 'order-created-customer':
        return this.sendOrderCreatedCustomer(job);
      case 'order-created-vendor':
        return this.sendOrderCreatedVendor(job);
      case 'rider-password-reset-otp':
        return this.sendPasswordResetOtp(job);
      case 'vendor-login-notification':
        return this.sendVendorLoginNotification(job);
      case 'vendor-account-created':
        return this.sendVendorAccountCreated(job);
      case 'vendor-password-changed':
        return this.sendVendorPasswordChanged(job);
      case 'vendor-password-reset':
        return this.sendVendorPasswordReset(job);
      case 'vendor-signup-otp':
        return this.sendVendorSignupOtp(job);
      case 'vendor-bank-added':
        return this.sendVendorBankAdded(job);
      case 'vendor-withdrawal':
        return this.sendVendorWithdrawal(job);
      case 'vendor-deletion-request':
        return this.sendVendorDeletionRequest(job);
      // Rider email jobs
      case 'rider-welcome':
        return this.sendRiderWelcome(job);
      case 'rider-password-reset':
        return this.sendRiderPasswordReset(job);
      case 'rider-password-changed':
        return this.sendRiderPasswordChanged(job);
      case 'rider-account-approved':
        return this.sendRiderAccountApproved(job);
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

  private async sendUserMessage(
    job: Job<{ email: string; subject: string; message: string }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: job.data.subject,
      text: job.data.message,
    });
  }

  private async sendRiderMessage(
    job: Job<{ email: string; subject: string; message: string }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: job.data.subject,
      text: job.data.message,
    });
  }

  private async sendAdminAlert(
    job: Job<{ adminEmails: string; subject: string; message: string }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.adminEmails,
      subject: `[ADMIN ALERT] ${job.data.subject}`,
      text: job.data.message,
    });
  }

  private async sendVendorStoreStatus(
    job: Job<{
      email: string;
      vendorName: string;
      storeName: string;
      newStatus: string;
      reason: string;
      isSuspended: boolean;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: `Store Status Update - ${job.data.storeName}`,
      template: './vendor-store-suspended',
      context: {
        vendorName: job.data.vendorName,
        storeName: job.data.storeName,
        newStatus: job.data.newStatus,
        reason: job.data.reason,
        isSuspended: job.data.isSuspended,
      },
    });
  }

  private async sendVendorProductStatus(
    job: Job<{
      email: string;
      vendorName: string;
      productName: string;
      newStatus: string;
      rejectionReason?: string;
      isRejected: boolean;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: `Product Status Update - ${job.data.productName}`,
      template: './vendor-product-status',
      context: {
        vendorName: job.data.vendorName,
        productName: job.data.productName,
        newStatus: job.data.newStatus,
        rejectionReason: job.data.rejectionReason,
        isRejected: job.data.isRejected,
      },
    });
  }

  private async sendRiderAccountStatus(
    job: Job<{
      email: string;
      riderName: string;
      newStatus: string;
      reason: string;
      isActive: boolean;
      isSuspended: boolean;
      isBanned: boolean;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: 'Account Status Update',
      template: './rider-account-status',
      context: {
        riderName: job.data.riderName,
        newStatus: job.data.newStatus,
        reason: job.data.reason,
        isActive: job.data.isActive,
        isSuspended: job.data.isSuspended,
        isBanned: job.data.isBanned,
      },
    });
  }

  private async sendRiderDocumentVerification(
    job: Job<{
      email: string;
      riderName: string;
      documentType: string;
      status: string;
      rejectionReason?: string;
      isVerified: boolean;
      isRejected: boolean;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: 'Document Verification Result',
      template: './rider-document-verification',
      context: {
        riderName: job.data.riderName,
        documentType: job.data.documentType,
        status: job.data.status,
        rejectionReason: job.data.rejectionReason,
        isVerified: job.data.isVerified,
        isRejected: job.data.isRejected,
      },
    });
  }

  private async sendCustomerAccountStatus(
    job: Job<{
      email: string;
      userName: string;
      newStatus: string;
      reason: string;
      isActive: boolean;
      isSuspended: boolean;
      isBanned: boolean;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: 'Account Status Update',
      template: './customer-account-status',
      context: {
        userName: job.data.userName,
        newStatus: job.data.newStatus,
        reason: job.data.reason,
        isActive: job.data.isActive,
        isSuspended: job.data.isSuspended,
        isBanned: job.data.isBanned,
      },
    });
  }

  private async sendAdminHighValueWithdrawal(
    job: Job<{
      adminEmails: string;
      entityType: string;
      amount: number;
      accountName: string;
      accountNumber: string;
      bankCode: string;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.adminEmails,
      subject: 'High Value Withdrawal Alert',
      template: './admin-high-value-withdrawal',
      context: {
        entityType: job.data.entityType,
        amount: job.data.amount,
        accountName: job.data.accountName,
        accountNumber: job.data.accountNumber,
        bankCode: job.data.bankCode,
      },
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

  private async sendPasswordResetOtp(
    job: Job<{ email: string; name: string; otp: string }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🔑 Password Reset OTP - Asoose',
      template: './password-reset-otp',
      context: {
        name: job.data.name,
        otp: job.data.otp,
        year: new Date().getFullYear(),
      },
    });
  }

  private async sendVendorSignupOtp(
    job: Job<{ email: string; name: string; otp: string; year: number }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '✉️ Verify Your Email - Asoose',
      template: './vendor-email-verification',
      context: {
        name: job.data.name,
        otp: job.data.otp,
        year: job.data.year,
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
      temporaryPassword: string;
      loginEmail: string;
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
        temporaryPassword: job.data.temporaryPassword,
        loginEmail: job.data.loginEmail,
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

  // ========== RIDER EMAIL HANDLERS ==========

  private async sendRiderWelcome(
    job: Job<{ email: string; name: string; year: number }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🏍️ Welcome to Asoose Riders!',
      template: 'rider-welcome',
      context: {
        name: job.data.name,
        year: job.data.year,
      },
    });
  }

  private async sendRiderPasswordReset(
    job: Job<{ email: string; name: string; otp: string; year: number }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🔑 Rider Password Reset Request',
      template: 'rider-password-reset',
      context: {
        name: job.data.name,
        otp: job.data.otp,
        year: job.data.year,
      },
    });
  }

  private async sendRiderPasswordChanged(
    job: Job<{
      email: string;
      name: string;
      timestamp: string;
      ipAddress: string;
      securityUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🔒 Your Rider Password Has Been Changed',
      template: 'rider-password-changed',
      context: {
        name: job.data.name,
        email: job.data.email,
        timestamp: job.data.timestamp,
        ipAddress: job.data.ipAddress,
        securityUrl: job.data.securityUrl,
        year: job.data.year,
      },
    });
  }

  private async sendRiderAccountApproved(
    job: Job<{
      email: string;
      name: string;
      commissionRate: number;
      appUrl: string;
      year: number;
    }>,
  ) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: '🎉 Your Rider Account is Approved!',
      template: 'rider-account-approved',
      context: {
        name: job.data.name,
        commissionRate: job.data.commissionRate,
        appUrl: job.data.appUrl,
        year: job.data.year,
      },
    });
  }
}
