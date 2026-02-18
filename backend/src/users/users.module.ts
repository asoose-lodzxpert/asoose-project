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

// Modules
import { RedisModule } from 'src/redis/redis.module';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { FcmModule } from 'src/libs/fcm/fcm.module';
import { TripsModule } from './trips/trips.module';
import { VendorModule } from 'src/vendor/vendor.module';
import { QueueModule } from 'src/matching/queue/queue.module';

@Module({
  imports: [
    PrismaModule,
    MailModule,
    ConfigModule,
    RedisModule,
    NotificationsModule,
    FcmModule,
    forwardRef(() => TripsModule), // ✅ FIXED: Wrapped in forwardRef to break circular dependency
    VendorModule,
    QueueModule,
    BullModule.registerQueue({
      name: 'email',
    }),
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
  ],
  exports: [
    UsersService,
    AddressesService,
    NotificationFacade,
    UserAccountNotificationsService,
  ],
})
export class UsersModule {}
