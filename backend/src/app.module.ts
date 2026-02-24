import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { appLogger } from './libs/logger/logger';
import { AppConfigModule } from './config/config.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { MongooseModule } from '@nestjs/mongoose';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';

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

@Module({
  imports: [
    // ---------- Global Config ----------
    AppConfigModule,

    // ---------- BullMQ / Redis ----------
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        ...(process.env.REDIS_TLS === 'true' && {
          tls: { servername: process.env.REDIS_HOST },
        }),
        maxRetriesPerRequest: null,
      },
    }),

    // ---------- Scheduling & Events ----------
    EventEmitterModule.forRoot({ global: true }),
    ScheduleModule.forRoot(),

    // ---------- MongoDB (optional — used only for error-log storage) ----------
    MongooseModule.forRootAsync({
      useFactory: () => ({
        uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/asoose',
        serverSelectionTimeoutMS: 3_000,
        connectTimeoutMS: 3_000,
        socketTimeoutMS: 5_000,
        retryWrites: false,
        // connectionFactory goes here (inside useFactory's return), not at async opts level
        connectionFactory: (connection: any) => {
          connection.on('error', (err: Error) => {
            appLogger.warn(
              '[MongoDB] Connection error (non-fatal): ' + err.message,
              { context: 'MongoDB' },
            );
          });
          connection.on('disconnected', () => {
            appLogger.warn(
              '[MongoDB] Disconnected — log writes will be skipped.',
              { context: 'MongoDB' },
            );
          });
          return connection;
        },
      }),
    }),

    // ---------- Rate Limiting ----------
    ThrottlerModule.forRoot([
      {
        ttl: 60_000,
        limit: 300, // 300 req/min globally; auth endpoints use stricter @Throttle() overrides
      },
    ]),

    // ---------- App Modules ----------
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
