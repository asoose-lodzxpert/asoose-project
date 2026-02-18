import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { ProfileController } from './profile/profile.controller';
import { ProfileService } from './profile/profile.service';
import { BankController } from './bank/bank.controller';
import { BankService } from './bank/bank.service';
import { NotificationController } from './notification/notification.controller';
import { NotificationService } from './notification/notification.service';
import { OrderController } from './order/order.controller';
import { OrderService } from './order/order.service';
import { WithdrawalController } from './withdrawal/withdrawal.controller';
import { WithdrawalService } from './withdrawal/withdrawal.service';
import { StatusController } from './status/status.controller';
import { StatusService } from './status/status.service';
import { RiderNotificationsController } from './rider-notifications.controller';
import { RiderNotificationsService } from './rider-notifications.service';
import { RiderDispatchListener } from './rider-dispatch.listener';
import { RidersStreamService } from './riders-stream.service';
import { PrismaModule } from '../prisma/prisma.module';
import { UsersModule } from '../users/users.module';
import { TripsModule } from '../users/trips/trips.module';
import { StorageModule } from '../storage/storage.module';
import { MatchingModule } from '../matching/matching.module';

import { TransactionsModule } from '../super-admin/transactions/transaction.module';
import { MailModule } from '../mail/mail.module';

import { RiderAccountNotificationsService } from './notifications/rider-account-notifications.service';
import { CommonModule } from '../common/common.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => UsersModule),
    TripsModule,
    MatchingModule,
    TransactionsModule,
    CacheModule.register(),
    MailModule,
    CommonModule,
  ],
  controllers: [
    ProfileController,
    BankController,
    NotificationController,
    OrderController,
    WithdrawalController,
    StatusController,
    RiderNotificationsController,
  ],
  providers: [
    ProfileService,
    BankService,
    NotificationService,
    OrderService,
    WithdrawalService,
    StatusService,
    RiderNotificationsService,
    RiderDispatchListener,
    RidersStreamService,
    RiderAccountNotificationsService,
  ],
  exports: [
    ProfileService,
    BankService,
    NotificationService,
    OrderService,
    WithdrawalService,
    StatusService,
    RiderNotificationsService,
    RidersStreamService,
    RiderAccountNotificationsService,
  ],
})
export class RidersModule {}
