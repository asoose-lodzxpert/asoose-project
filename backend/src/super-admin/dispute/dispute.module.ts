import { Module, forwardRef } from '@nestjs/common';
import { DisputesService } from './dispute.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DisputesController } from './dispute.controller';
import { TransactionsModule } from '../transactions/transaction.module';
import { PaymentModule } from 'src/payment/payment.module';
import { NotificationsModule } from 'src/notifications/notifications.module';

@Module({
  imports: [
    PrismaModule,
    TransactionsModule,
    forwardRef(() => PaymentModule),
    forwardRef(() => NotificationsModule),
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}
