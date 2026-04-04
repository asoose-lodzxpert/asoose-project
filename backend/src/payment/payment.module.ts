import { Module, forwardRef } from '@nestjs/common';
import { PaymentController } from './payment.controller';
import { PaymentService } from './payment.service';
import { PaymentInitService } from './payment-init.service';
import { PaymentVerifyService } from './payment-verify.service';
import { PaymentStatusService } from './payment-status.service';
import { PaymentDisbursementService } from './payment-disbursement.service';
import { PaystackService } from './paystack.service';
import { PaystackAccountService } from './paystack-account.service';
import { PrismaModule } from '../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { TripsModule } from '../users/trips/trips.module';
import { TransactionsModule } from '../super-admin/transactions/transaction.module';
import { EmailQueue } from '../queue/email.queue';
import { UsersModule } from '../users/users.module';
import {
  ChargeSuccessHandler,
  DvaAssignHandler,
  CustomerIdHandler,
  PaystackWebhookHandler,
} from './webhooks';

const webhookHandlers = [
  ChargeSuccessHandler,
  DvaAssignHandler,
  CustomerIdHandler,
  PaystackWebhookHandler,
];

@Module({
  imports: [
    PrismaModule,
    NotificationsModule,
    forwardRef(() => TripsModule),
    forwardRef(() => TransactionsModule),
    forwardRef(() => UsersModule),
    EmailQueue,
  ],
  controllers: [PaymentController],
  providers: [
    PaymentService,
    PaymentInitService,
    PaymentVerifyService,
    PaymentStatusService,
    PaymentDisbursementService,
    PaystackService,
    PaystackAccountService,
    ...webhookHandlers,
  ],
  exports: [
    PaymentService,
    PaymentInitService,
    PaystackService,
    PaystackAccountService,
  ],
})
export class PaymentModule {}
