import { Module, forwardRef } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionLedgerService } from './transaction-ledger.service';
import { PaymentModule } from 'src/payment/payment.module';
import { TransactionsController } from './transaction.controller';
import { TransactionsService } from './transaction.service';
@Module({
  imports: [forwardRef(() => PaymentModule)],
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionLedgerService, PrismaService],
  exports: [TransactionLedgerService, TransactionsService],
})
export class TransactionsModule {}
