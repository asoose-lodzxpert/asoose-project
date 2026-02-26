import { Module } from '@nestjs/common';
import { MailerModule } from '@nestjs-modules/mailer';
import { ConfigService, ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { EmailProcessor } from './email.processor';
import { EmailProducer } from './email.producer';
import { HandlebarsAdapter } from '@nestjs-modules/mailer/dist/adapters/handlebars.adapter';
import { join } from 'path';

@Module({
  imports: [
    BullModule.registerQueue({
      name: 'email',
      defaultJobOptions: {
        attempts: 3,
        backoff: { type: 'exponential', delay: 3000 },
        removeOnComplete: { count: 100 }, // keep the last 100 completed jobs
        removeOnFail: { count: 50 }, // keep the last 50 failed jobs
      },
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const port = config.get<number>('EMAIL_PORT') ?? 587;
        const secure = String(config.get('EMAIL_SECURE')) === 'true';

        return {
          transport: {
            host: config.get<string>('EMAIL_HOST'),
            port,
            // port 465 → implicit TLS (secure: true)
            // port 587 → STARTTLS (secure: false)
            secure,
            auth: {
              user: config.get<string>('EMAIL_USER'),
              pass: config.get<string>('EMAIL_PASSWORD'),
            },
            // Fail fast so BullMQ exponential backoff can retry cleanly
            connectionTimeout: 10_000, // 10 s to open TCP connection
            greetingTimeout: 10_000, // 10 s for SMTP greeting
            socketTimeout: 30_000, // 30 s of inactivity kills the socket
            tls: {
              // allow self-signed certs on staging; set to true in production
              rejectUnauthorized: config.get('NODE_ENV') === 'production',
            },
          },
          defaults: {
            from: `"Asoose " <${config.get<string>('EMAIL_FROM')}>`,
          },
          template: {
            dir: join(__dirname, '..', '..', 'libs', 'mail', 'templates'),
            adapter: new HandlebarsAdapter(),
            options: {
              strict: true,
            },
          },
        };
      },
    }),
  ],
  providers: [EmailProcessor, EmailProducer],
  exports: [EmailProducer, BullModule],
})
export class MailModule {}
