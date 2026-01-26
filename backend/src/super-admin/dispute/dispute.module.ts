import { Module, forwardRef } from '@nestjs/common';
import { DisputesService } from './dispute.service';
import { PrismaModule } from 'src/prisma/prisma.module';
import { DisputesController } from './dispute.controller';
import { TransactionsModule } from '../transactions/transaction.module';
import { PaymentModule } from 'src/payment/payment.module'; // 1. Import PaymentModule

@Module({
  imports: [
    PrismaModule,
    TransactionsModule,
    // 2. Add to imports using forwardRef to match your Service injection
    forwardRef(() => PaymentModule),
  ],
  controllers: [DisputesController],
  providers: [DisputesService],
  exports: [DisputesService],
})
export class DisputesModule {}