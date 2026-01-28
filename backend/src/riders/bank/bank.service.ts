import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@Injectable()
export class BankService {
  constructor(private readonly prisma: PrismaService) {}

  async getBankAccount(riderId: string) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { riderId },
      select: {
        id: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { bankAccount };
  }

  async updateBankAccount(riderId: string, updateData: UpdateBankAccountDto) {
    const existingAccount = await this.prisma.bankAccount.findUnique({
      where: { riderId },
    });
    if (!existingAccount) {
      if (
        !updateData.bankName ||
        !updateData.accountNumber ||
        !updateData.accountName
      ) {
        throw new Error(
          'Bank name, account number, and account name are required',
        );
      }
      const newAccount = await this.prisma.bankAccount.create({
        data: {
          riderId,
          bankName: updateData.bankName,
          bankCode: updateData.bankCode || '',
          accountNumber: updateData.accountNumber,
          accountName: updateData.accountName,
        },
        select: {
          id: true,
          bankName: true,
          bankCode: true,
          accountNumber: true,
          accountName: true,
          createdAt: true,
          updatedAt: true,
        },
      });
      return {
        message: 'Bank account created successfully',
        bankAccount: newAccount,
      };
    }
    const updatedAccount = await this.prisma.bankAccount.update({
      where: { riderId },
      data: {
        ...(updateData.bankName && { bankName: updateData.bankName }),
        ...(updateData.bankCode && { bankCode: updateData.bankCode }),
        ...(updateData.accountNumber && {
          accountNumber: updateData.accountNumber,
        }),
        ...(updateData.accountName && { accountName: updateData.accountName }),
      },
      select: {
        id: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return {
      message: 'Bank account updated successfully',
      bankAccount: updatedAccount,
    };
  }
}
