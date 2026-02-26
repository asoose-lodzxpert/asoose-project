import { Module, Logger } from '@nestjs/common';
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
        removeOnComplete: { count: 100 },
        removeOnFail: { count: 50 },
      },
    }),

    MailerModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const logger = new Logger('MailModule');

        const host = config.get<string>('EMAIL_HOST');
        const port = config.get<number>('EMAIL_PORT') ?? 587;
        const secure = String(config.get('EMAIL_SECURE')) === 'true';
        const user = config.get<string>('EMAIL_USER');
        const pass = config.get<string>('EMAIL_PASSWORD');
        const from = config.get<string>('EMAIL_FROM');

        // 🚨 Check required variables
        if (!host || !user || !pass || !from) {
          logger.error('❌ Email configuration is incomplete.');
          logger.error(`EMAIL_HOST: ${host}`);
          logger.error(`EMAIL_USER: ${user ? '✔ set' : '❌ missing'}`);
          logger.error(`EMAIL_PASSWORD: ${pass ? '✔ set' : '❌ missing'}`);
          logger.error(`EMAIL_FROM: ${from}`);

          logger.warn('⚠️ MailerModule will be initialized in disabled mode.');

          // Return disabled transport to prevent crashes
          return {
            transport: {
              jsonTransport: true,
            },
          };
        }

        if ((port === 465 && !secure) || (port === 587 && secure)) {
          logger.warn(
            `⚠️ Possible port/secure mismatch → port=${port}, secure=${secure}`,
          );
        }

        logger.log(
          `📨 Mailer configured for ${host}:${port} (secure=${secure})`,
        );

        return {
          transport: {
            pool: true, // Enable connection pooling to prevent rate limits
            maxConnections: 5, // Limit concurrent SMTP connections
            maxMessages: 100, // Restart connection after 100 emails

            host,
            port,
            secure,
            auth: {
              user,
              pass,
            },

            connectionTimeout: 10_000,
            greetingTimeout: 10_000,
            socketTimeout: 30_000,

            // Verbose SMTP logging — development only (exposes auth in logs)
            logger: config.get('NODE_ENV') !== 'production',
            debug: config.get('NODE_ENV') !== 'production',

            tls: {
              rejectUnauthorized: config.get('NODE_ENV') === 'production',
            },
          },
          defaults: {
            from: `"Asoose" <${from}>`,
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
