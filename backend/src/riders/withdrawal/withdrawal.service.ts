import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';
import { TransactionLedgerService } from '../../super-admin/transactions/transaction-ledger.service';
import { UserRole } from '../../common/enums/user-role.enum';

@Injectable()
export class WithdrawalService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: TransactionLedgerService,
  ) {}

  async getWithdrawalInfo(riderId: string) {
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        walletBalance: true,
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            bankCode: true,
            accountNumber: true,
            accountName: true,
          },
        },
      },
    });
    if (!rider) {
      throw new NotFoundException('Rider not found');
    }
    const minWithdrawalSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'min_withdrawal' },
    });
    const minWithdrawal = minWithdrawalSetting
      ? Number(minWithdrawalSetting.value)
      : 5000;
    return {
      balance: rider.walletBalance,
      minWithdrawal,
      bankAccount: rider.bankAccount,
    };
  }

  async requestWithdrawal(
    riderId: string,
    createWithdrawalDto: CreateWithdrawalDto,
  ) {
    const { amount, bankAccountId } = createWithdrawalDto;

    // 1. Fetch Rider & Validate Eligibility
    const rider = await this.prisma.rider.findUnique({
      where: { id: riderId },
      select: {
        id: true,
        walletBalance: true,
        bankAccount: {
          select: {
            id: true,
            bankName: true,
            bankCode: true,
            accountNumber: true,
            accountName: true,
          },
        },
      },
    });

    if (!rider) {
      throw new NotFoundException('Rider not found');
    }
    if (!rider.bankAccount) {
      throw new BadRequestException('No bank account configured');
    }
    if (rider.bankAccount.id !== bankAccountId) {
      throw new BadRequestException('Invalid bank account');
    }

    const minWithdrawalSetting = await this.prisma.systemSetting.findUnique({
      where: { key: 'min_withdrawal' },
    });
    const minWithdrawal = minWithdrawalSetting
      ? Number(minWithdrawalSetting.value)
      : 5000;

    if (amount < minWithdrawal) {
      throw new BadRequestException(
        `Minimum withdrawal is ₦${minWithdrawal.toLocaleString()}`,
      );
    }
    if (amount > rider.walletBalance) {
      throw new BadRequestException('Insufficient balance');
    }

    // Wrap Payout creation and Ledger invocation inside a single transaction
    const withdrawal = await this.prisma.$transaction(async (tx) => {
      // 2. Create Payout Record (PENDING)
      const newWithdrawal = await tx.riderPayout.create({
        data: {
          riderId,
          amount,
          bankAccountId, // Ensure we track where the money is going
          status: 'PENDING',
        },
        select: {
          id: true,
          amount: true,
          status: true,
          createdAt: true,
          processedAt: true,
        },
      });

      // 3. Call Ledger to Handle Debit & Audit (CRITICAL FIX)
      // The ledger service handles the decrement transactionally, creates the ledger entry,
      // and throws an exception if the balance drops below zero, rolling back everything.
      await this.ledger.recordPayoutRequest(
        riderId,
        UserRole.RIDER,
        amount,
        newWithdrawal.id,
        tx,
      );

      return newWithdrawal;
    });

    return {
      message: 'Withdrawal request submitted successfully',
      withdrawal: {
        id: withdrawal.id,
        amount: withdrawal.amount,
        status: withdrawal.status,
        bankAccount: rider.bankAccount,
        createdAt: withdrawal.createdAt.toISOString(),
        processedAt: withdrawal.processedAt?.toISOString(),
      },
    };
  }
}
