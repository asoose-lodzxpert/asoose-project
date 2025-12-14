import { Processor } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { MailerService } from '@nestjs-modules/mailer';

@Processor('email')
export class EmailProcessor {
  constructor(private readonly mailer: MailerService) {}

  // Use a method named after the job name
  async 'send-welcome'(job: Job<{ email: string }>) {
    await this.mailer.sendMail({
      to: job.data.email,
      subject: 'Welcome 🎉',
      text: 'Welcome to our marketplace!',
    });
  }
}
