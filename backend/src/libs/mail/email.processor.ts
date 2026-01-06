import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('email')
export class EmailProcessor extends WorkerHost { 
  constructor(private readonly mailer: MailerService) {
    super();
  }

  // ✅ Main worker handler
  async process(job: Job<any, any, string>): Promise<any> {
    switch (job.name) {
      case 'send-welcome':
        return this.sendWelcome(job);
      case 'send-vendor-message':
        return this.sendVendorMessage(job);
      default:
        throw new Error(`Unknown job name: ${job.name}`);
    }
  }

  private async sendWelcome(job: Job<{ email: string }>) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: 'Welcome 🎉',
      text: 'Welcome to our marketplace!',
    });
  }

  // ✅ ADD THIS HANDLER
  private async sendVendorMessage(job: Job<{ email: string; subject: string; message: string }>) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: job.data.subject,
      text: job.data.message, 
      // html: `<p>${job.data.message}</p>` // You can use HTML too
    });
  }
}