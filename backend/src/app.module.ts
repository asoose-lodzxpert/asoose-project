import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { ScheduleModule } from '@nestjs/schedule';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import { AuthModule } from './auth/auth.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { VendorModule } from './vendor/vendor.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CartModule } from './cart/cart.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';

import { QueueModule } from './queue/queue.module';
import { FcmModule } from './libs/fcm/fcm.module';
import { MapsModule } from './maps/maps.module';

@Module({
  imports: [
    // ---------- Global Config ----------
    ConfigModule.forRoot({ isGlobal: true }),

    // ---------- Rate Limiting ----------
    ThrottlerModule.forRoot(),

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
        enableReadyCheck: true,
        connectTimeout: 10000,
      },
    }),

    // ---------- Scheduling & Events ----------
    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ global: true }),

    // ---------- App Modules ----------
    AuthModule,
    PrismaModule,
    RedisModule,
    SuperAdminModule,
    VendorModule,
    MarketplaceModule,
    CartModule,
    UsersModule,
    NotificationsModule,
    QueueModule,
    FcmModule,
    MapsModule,
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
