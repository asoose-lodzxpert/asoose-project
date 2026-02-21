import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaystackService } from './paystack.service';
import { PaystackAccountService } from './paystack-account.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TripsModule } from '../users/trips/trips.module';
import { TransactionsModule } from '../super-admin/transactions/transaction.module';
import { EmailQueue } from '../queue/email.queue';

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    forwardRef(() => TripsModule), // Existing forwardRef
    // FIX: Wrap TransactionsModule with forwardRef
    forwardRef(() => TransactionsModule),
    EmailQueue,
  ],
  controllers: [PaymentController],
  providers: [PaymentService, PaystackService, PaystackAccountService],
  exports: [PaymentService, PaystackService, PaystackAccountService],
})
export class PaymentModule {}
