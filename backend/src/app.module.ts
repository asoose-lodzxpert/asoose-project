import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { AppConfigModule } from './config/config.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { CartModule } from './cart/cart.module';
import { FcmModule } from './libs/fcm/fcm.module';
import { MailModule } from './mail/mail.module';
import { MapsModule } from './maps/maps.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { NotificationsModule } from './notifications/notifications.module';
import { PaymentModule } from './payment/payment.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { RedisModule } from './redis/redis.module';
import { RidersModule } from './riders/riders.module';
import { StorageModule } from './storage/storage.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { UsersModule } from './users/users.module';
import { VendorModule } from './vendor/vendor.module';
import { LogsModule } from './logs/logs.module';
import { FareModule } from './fare/fare.module';
import { LoggerModule } from './libs/logger/logger.module';
import { MetricsModule } from './metrics/metrics.module';
import { SupportModule } from './support/support.module';
import { AdminAuditModule } from './admin-audit/admin-audit.module';
import { ScheduledRidesModule } from './scheduled-rides/scheduled-rides.module';
import { RideContactsModule } from './ride-contacts/ride-contacts.module';
import { ChatModule } from './chat/chat.module';

@Module({
  imports: [
    // ---------- Global Config ----------
    AppConfigModule,

    // ---------- BullMQ / Redis ----------
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        connection: {
          host: cs.get<string>('REDIS_HOST', 'localhost'),
          port: cs.get<number>('REDIS_PORT', 6379),
          username: cs.get<string>('REDIS_USERNAME') || undefined,
          password: cs.get<string>('REDIS_PASSWORD') || undefined,
          ...(cs.get<string>('REDIS_TLS') === 'true' && {
            tls: { servername: cs.get<string>('REDIS_HOST') },
          }),
          maxRetriesPerRequest: null,
        },
      }),
    }),

    // ---------- Scheduling & Events ----------
    // wildcard + delimiter are required so dot-namespaced events (e.g. 'job.assigned',
    // 'ride.requested') are routed correctly to @OnEvent() listeners.
    EventEmitterModule.forRoot({
      global: true,
      wildcard: true,
      delimiter: '.',
    }),
    ScheduleModule.forRoot(),


    // ---------- Rate Limiting ----------
    // ThrottlerStorageRedisService shares counters across instances and survives restarts.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (cs: ConfigService) => ({
        throttlers: [
          {
            ttl: 60_000,
            limit: 300, // 300 req/min globally; auth endpoints use stricter @Throttle() overrides
          },
        ],
        storage: new ThrottlerStorageRedisService({
          host: cs.get<string>('REDIS_HOST', 'localhost'),
          port: cs.get<number>('REDIS_PORT', 6379),
          username: cs.get<string>('REDIS_USERNAME') || undefined,
          password: cs.get<string>('REDIS_PASSWORD') || undefined,
          ...(cs.get<string>('REDIS_TLS') === 'true' && {
            tls: { servername: cs.get<string>('REDIS_HOST') },
          }),
        }),
      }),
    }),

    // ---------- App Modules ----------
    LoggerModule,
    MetricsModule,
    AuthModule,
    CartModule,
    FcmModule,
    LogsModule,
    MailModule,
    MapsModule,
    MarketplaceModule,
    NotificationsModule,
    PaymentModule,
    PrismaModule,
    QueueModule,
    RedisModule,
    RidersModule,
    StorageModule,
    SuperAdminModule,
    UsersModule,
    VendorModule,
    FareModule,
    SupportModule,
    AdminAuditModule,
    ScheduledRidesModule,
    RideContactsModule,
    ChatModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
