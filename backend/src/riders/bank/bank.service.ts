import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaystackAccountService } from '../../payment/paystack-account.service';
import { UpdateBankAccountDto } from '../dto/update-bank-account.dto';

@Injectable()
export class BankService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackAccount: PaystackAccountService,
  ) {}

  // ─── Banks ────────────────────────────────────────────────────────────────

  async getBanks() {
    const banks = await this.paystackAccount.listBanks('nigeria');
    return banks.map((b) => ({ id: b.code, name: b.name, code: b.code }));
  }

  async verifyAccountNumber(bankCode: string, accountNumber: string) {
    return await this.paystackAccount.resolveAccountNumber(
      accountNumber,
      bankCode,
    );
  }

  async getBankAccount(riderId: string) {
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { riderId },
      select: {
        id: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        paystackRecipientCode: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return { bankAccount };
  }

  async updateBankAccount(riderId: string, updateData: UpdateBankAccountDto) {
    // Determine the final values — prefer incoming data, fallback to existing row
    const existing = await this.prisma.bankAccount.findUnique({
      where: { riderId },
    });

    const bankCode = updateData.bankCode || existing?.bankCode || '';
    const accountNumber =
      updateData.accountNumber || existing?.accountNumber || '';
    const bankName = updateData.bankName || existing?.bankName || '';

    if (!bankCode || !accountNumber || !bankName) {
      throw new BadRequestException(
        'Bank code, account number and bank name are required',
      );
    }

    // 1. Verify account with Paystack and get the canonical account name
    let accountName = updateData.accountName || existing?.accountName || '';
    try {
      const resolved = await this.paystackAccount.resolveAccountNumber(
        accountNumber,
        bankCode,
      );
      accountName = resolved.accountName;
    } catch {
      // Paystack resolve failed — use whatever name was provided
      if (!accountName) {
        throw new BadRequestException(
          'Could not verify account number. Please check the account and bank code.',
        );
      }
    }

    // 2. Create (or re-create) a Paystack transfer recipient
    let paystackRecipientCode = existing?.paystackRecipientCode ?? null;
    try {
      const recipient = await this.paystackAccount.createRiderTransferRecipient(
        {
          name: accountName,
          accountNumber,
          bankCode,
        },
      );
      paystackRecipientCode = recipient.recipientCode;
    } catch (err) {
      // Non-fatal: persist data even if Paystack is temporarily unavailable
      // The code can be created later when a payout is triggered
    }

    // 3. Persist to DB
    const select = {
      id: true,
      bankName: true,
      bankCode: true,
      accountNumber: true,
      accountName: true,
      paystackRecipientCode: true,
      createdAt: true,
      updatedAt: true,
    } as const;

    if (!existing) {
      const newAccount = await this.prisma.bankAccount.create({
        data: {
          riderId,
          bankName,
          bankCode,
          accountNumber,
          accountName,
          ...(paystackRecipientCode && { paystackRecipientCode }),
        },
        select,
      });
      return {
        message: 'Bank account created successfully',
        bankAccount: newAccount,
      };
    }

    const updatedAccount = await this.prisma.bankAccount.update({
      where: { riderId },
      data: {
        bankName,
        bankCode,
        accountNumber,
        accountName,
        ...(paystackRecipientCode && { paystackRecipientCode }),
      },
      select,
    });
    return {
      message: 'Bank account updated successfully',
      bankAccount: updatedAccount,
    };
  }
}
