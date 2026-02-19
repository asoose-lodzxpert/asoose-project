import { Module, forwardRef } from '@nestjs/common';
import { PayoutsController } from './payouts.controller';
import { PayoutsService } from './payouts.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TransactionsModule } from '../transactions/transaction.module';
import { PaymentModule } from 'src/payment/payment.module';
import { MailModule } from 'src/mail/mail.module';
import { LoggerModule } from 'src/libs/logger/logger.module';
import { ActivityLogService } from 'src/common/services/activity-log.services';
import { AdminNotificationsService } from 'src/admin/notifications/admin-notifications.service';

@Module({
  imports: [
    PrismaModule,
    TransactionsModule,
    forwardRef(() => PaymentModule),
    MailModule,
    LoggerModule,
  ],
  controllers: [PayoutsController],
  providers: [PayoutsService, ActivityLogService, AdminNotificationsService],
  exports: [PayoutsService],
})
export class PayoutsModule {}
