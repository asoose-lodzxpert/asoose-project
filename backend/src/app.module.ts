import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; 
import { PrismaModule } from './prisma/prisma.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { QueueModule } from './libs/queue/queue.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { CartModule } from './cart/cart.module';
import { UsersModule } from './users/users.module';
import { NotificationsModule } from './notifications/notifications.module';
import { VendorModule } from './vendor/vendor.module';
import { ScheduleModule } from '@nestjs/schedule';
import { FcmModule } from './libs/fcm/fcm.module';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { BullModule } from '@nestjs/bullmq';
@Module({
  imports: [
    ThrottlerModule.forRoot([
        {
            ttl: 60000, 
            limit: 10,  
        }
    ]),
    ConfigModule.forRoot({ 
      isGlobal: true,
    }), 
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
      },
    }),
    ScheduleModule.forRoot(),
    AuthModule,
    SuperAdminModule,
    PrismaModule,
    QueueModule,
    MarketplaceModule,
    CartModule,
    UsersModule,
    NotificationsModule,
    VendorModule,
    FcmModule,
   EventEmitterModule.forRoot({ global: true })
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, 
    }
  ],
})
export class AppModule {}