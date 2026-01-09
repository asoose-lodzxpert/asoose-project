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

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),

    ThrottlerModule.forRoot({
      ttl: 60_000,
      limit: 10,
    }),

    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),

    ScheduleModule.forRoot(),
    EventEmitterModule.forRoot({ global: true }),

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
