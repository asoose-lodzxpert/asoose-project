import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { PrismaModule } from '../prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
// Services
import { OrdersService } from './orders.service';
import { AddressesService } from './addresses.service';
import { PricingService } from './pricing.service';
import { InventoryService } from './inventory.service';
import { NotificationFacade } from './notification.facade';

// Modules
import { RedisModule } from 'src/redis/redis.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FcmModule } from 'src/libs/fcm/fcm.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    ConfigModule,
    RedisModule,
    NotificationsModule, 
    FcmModule,
    RedisModule,
    BullModule.registerQueue({
      name: 'email',
    }),
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    OrdersService,
    AddressesService,
    PricingService,
    InventoryService,
    NotificationFacade,
  ],
  exports: [UsersService, AddressesService],
})
export class UsersModule {}