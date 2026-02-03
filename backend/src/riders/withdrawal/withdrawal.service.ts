import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateWithdrawalDto } from '../dto/create-withdrawal.dto';

@Injectable()
export class WithdrawalService {
  constructor(private readonly prisma: PrismaService) {}

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
    const withdrawal = await this.prisma.riderPayout.create({
      data: {
        riderId,
        amount,
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
    await this.prisma.rider.update({
      where: { id: riderId },
      data: {
        walletBalance: {
          decrement: amount,
        },
      },
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
