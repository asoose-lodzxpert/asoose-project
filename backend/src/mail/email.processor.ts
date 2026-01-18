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

  private async sendVendorMessage(job: Job<{ email: string; subject: string; message: string }>) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: job.data.subject,
      text: job.data.message, 
    });
  }

  private async sendOrderCreatedCustomer(job: Job<{ email: string; orderId: string; total: number }>) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: `Order Confirmed - #${job.data.orderId}`,
      template: './order-confirmation',
      context: { 
        orderId: job.data.orderId,
        total: job.data.total
      }
    });
  }

  private async sendOrderCreatedVendor(job: Job<{ email: string; storeName: string; orderId: string; items: any[] }>) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: `New Order Alert - #${job.data.orderId}`,
      template: './vendor-new-order',
      context: {
        storeName: job.data.storeName,
        orderId: job.data.orderId,
        items: job.data.items
      }
    });
  }
}