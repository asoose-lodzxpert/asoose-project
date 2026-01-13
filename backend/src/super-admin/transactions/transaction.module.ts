import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { TransactionsController } from './transaction.controller';
import { TransactionsService } from './transaction.service';
import { TransactionLedgerService } from './transaction-ledger.service';
@Module({
  controllers: [TransactionsController],
  providers: [TransactionsService, TransactionLedgerService, PrismaService],
  exports: [TransactionLedgerService],
})
export class TransactionsModule {}
