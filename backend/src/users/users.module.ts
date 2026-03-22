import { Module, forwardRef } from '@nestjs/common'; // ✅ IMPORTED forwardRef
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
import { CommonModule } from '../common/common.module';
import { UserAccountNotificationsService } from './notifications/user-account-notifications.service';
import { IdempotencyService } from './idempotency.service';
import { OrderReadyListenerService } from './order-ready-listener.service';
import { OrderRemindersProcessor } from './order-reminders.processor';

// Modules
import { RedisModule } from 'src/redis/redis.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FcmModule } from 'src/libs/fcm/fcm.module';
import { ExpoModule } from 'src/libs/expo/expo.module';
import { TripsModule } from './trips/trips.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { QueueModule } from 'src/matching/queue/queue.module';
import { FareModule } from '../fare/fare.module';
import { PaystackAccountService } from '../payment/paystack-account.service';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    ConfigModule,
    RedisModule,
    NotificationsModule,
    FcmModule,
    ExpoModule,
    forwardRef(() => TripsModule),
    VendorModule,
    QueueModule,
    FareModule,
    BullModule.registerQueue(
      { name: 'email' },
      { name: 'order-reminders' },
    ),
    CommonModule,
  ],
  controllers: [UsersController],
  providers: [
    UsersService,
    OrdersService,
    AddressesService,
    PricingService,
    InventoryService,
    NotificationFacade,
    UserAccountNotificationsService,
    IdempotencyService,
    PaystackAccountService,
    OrderReadyListenerService,
    OrderRemindersProcessor,
  ],
  exports: [
    UsersService,
    AddressesService,
    NotificationFacade,
    UserAccountNotificationsService,
    IdempotencyService,
  ],
})
export class UsersModule { }
