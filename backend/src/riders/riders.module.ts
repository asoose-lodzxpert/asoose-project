import { Module, forwardRef } from '@nestjs/common';
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
import { RidersController } from './riders.controller';
// ✅ IMPORT THIS
import { TransactionsModule } from '../super-admin/transactions/transaction.module';

@Module({
  imports: [
    PrismaModule,
    StorageModule,
    forwardRef(() => UsersModule),
    TripsModule,
    MatchingModule,
    // ✅ ADD THIS
    TransactionsModule, 
  ],
  controllers: [
    ProfileController,
    BankController,
    NotificationController,
    OrderController,
    WithdrawalController,
    StatusController,
    RiderNotificationsController,
    RidersController,
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
  ],
})
export class RidersModule {}