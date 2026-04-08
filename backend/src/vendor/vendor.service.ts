import {
  Injectable,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { AppLogger } from '../libs/logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { PaystackAccountService } from '../payment/paystack-account.service';
import { PaystackService } from '../payment/paystack.service';
import { VendorSecurityNotificationsService } from './notifications/vendor-security-notifications.service';
import { TransactionLedgerService } from '../super-admin/transactions/transaction-ledger.service';
import { UserRole } from '../common/enums/user-role.enum';

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paystackAccount: PaystackAccountService,
    private readonly paystackService: PaystackService,
    private readonly securityNotifications: VendorSecurityNotificationsService,
    private readonly appLogger: AppLogger,
    private readonly ledger: TransactionLedgerService,
  ) {}

  async getStorePublicDetails(vendorId: string) {
    const store = await this.prisma.store.findUnique({
      where: { vendorId },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logo: true,
        banner: true,
        status: true,
        type: true,
        address: true,
        rating: true,
        isOpen: true,
        cityId: true,
        createdAt: true,
        updatedAt: true,
      },
    });
    return store;
  }

  async updateVendorImage(vendorId: string, imageUrl: string, type?: string) {
    let vendor;
    if (type === 'banner') {
      // update store banner
      const store = await this.prisma.store.update({
        where: { vendorId },
        data: { banner: imageUrl },
        select: { vendorId: true },
      });
      // fetch vendor details to return
      vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          status: true,
        },
      });
    } else {
      vendor = await this.prisma.vendor.update({
        where: { id: vendorId },
        data: { image: imageUrl },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          image: true,
          status: true,
        },
      });
    }

    // Send profile update notification
    try {
      await this.securityNotifications.notifyProfileImageUpdated(
        vendor.id,
        vendor.email,
        vendor.name,
      );
    } catch (error) {
      this.appLogger.error(
        'Failed to send profile update notification',
        error?.stack,
        { error },
      );
    }

    return vendor;
  }

  async getStoreBalance(vendorId: string) {
    const store = await this.prisma.store.findUnique({
      where: { vendorId },
      select: { walletBalance: true, commissionRate: true },
    });
    return {
      amount: store?.walletBalance ?? 0,
      commissionRate: store?.commissionRate ?? 20,
    };
  }

  async getVendorStatus(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
    });
    return { status: vendor?.status || 'PENDING' };
  }

  async getVendorActiveStatus(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    const active = store?.status === 'ACTIVE';
    return { active };
  }

  /** Update the city a store is registered in. Validates city is active. */
  async updateStoreCity(vendorId: string, cityId: string) {
    const city = await this.prisma.city.findUnique({ where: { id: cityId } });
    if (!city) throw new Error('City not found');
    if (!city.isActive) throw new Error(`${city.name} is not yet an active service area`);

    const store = await this.prisma.store.update({
      where: { vendorId },
      data: { cityId },
      select: { id: true, cityId: true },
    });
    return { storeId: store.id, cityId: store.cityId, cityName: city.name };
  }

  /** Return the list of active cities for vendor dropdowns */
  async getActiveCities() {
    return this.prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, state: true },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });
  }

  async getStoreMetrics(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store)
      return {
        todaysOrders: 0,
        todaysSales: 0,
        pendingApprovals: 0,
        avgRating: 0,
      };
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Fetch all PAID orders for today (any status)
    const orders = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: today },
        paymentStatus: 'PAID',
      },
    });

    // Only count DELIVERED orders for metrics
    let todaysOrders = 0;
    let todaysSales = 0;
    for (const o of orders) {
      if (o.status === 'DELIVERED') {
        todaysOrders++;
        todaysSales += o.total || 0;
      }
    }

    // Count all orders for today NOT DELIVERED, CANCELLED, or REJECTED
    const pendingApprovals = await this.prisma.order.count({
      where: {
        storeId: store.id,
        createdAt: { gte: today },
        status: {
          notIn: ['DELIVERED', 'CANCELLED', 'REJECTED'],
        },
      },
    });

    const avgRating = Math.round(store.rating || 0);
    return {
      todaysOrders,
      todaysSales,
      pendingApprovals,
      avgRating,
      commissionRate: store.commissionRate ?? 20,
    };
  }

  async isStoreOnline(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    return { isOnline: !!store?.isOpen };
  }

  // Toggle store online status
  async toggleStoreOnline(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) return { isOnline: false };
    const newIsOpen = !store.isOpen;
    await this.prisma.store.update({
      where: { id: store.id },
      data: { isOpen: newIsOpen },
    });
    return { isOnline: newIsOpen };
  }

  // Get latest 5 orders for store
  async getStoreOrders(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) return [];
    const orders = await this.prisma.order.findMany({
      where: { storeId: store.id, paymentStatus: 'PAID' },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        user: true,
        items: true,
      },
    });

    return orders.map((order) => ({
      id: order.id,
      customerName: order.user?.name || '',
      customerProfile: order.user?.image || '',
      items: order.items.map((i) => ({
        id: i.id,
        name: i.nameSnap,
        quantity: i.quantity,
        price: i.price,
      })),
      total: order.items.reduce(
        (s: number, i: any) =>
          s + (Number(i.price) || 0) * (Number(i.quantity) || 0),
        0,
      ),
      status: order.status.toLowerCase(),
      timestamp: order.createdAt.toISOString(),
    }));
  }

  // Get bank accounts for vendor
  async getBankAccounts(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) return [];

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
      select: {
        id: true,
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        paystackRecipientCode: true,
      },
    });

    return bankAccount;
  }

  // Get single bank account for vendor
  async getBankAccount(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) return null;

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
      select: {
        bankName: true,
        bankCode: true,
        accountNumber: true,
        accountName: true,
        paystackRecipientCode: true,
      },
    });

    return bankAccount;
  }

  // Get all Nigerian banks from Paystack
  async getBanks() {
    const banks = await this.paystackAccount.listBanks('nigeria');
    // Map to { id, name, code } shape expected by mobile clients
    return banks.map((b) => ({ id: b.code, name: b.name, code: b.code }));
  }

  // Verify account number via Paystack
  async verifyAccountNumber(bankCode: string, accountNumber: string) {
    return await this.paystackAccount.resolveAccountNumber(
      accountNumber,
      bankCode,
    );
  }

  // Save (create or update) bank account — verifies via Paystack and stores recipient + subaccount codes
  async saveBankAccount(
    vendorId: string,
    data: {
      bankName: string;
      bankCode: string;
      accountNumber: string;
      accountName: string;
    },
  ) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) throw new Error('Store not found');

    // 1. Verify account with Paystack to get canonical account name
    let resolvedName = data.accountName;
    try {
      const resolved = await this.paystackAccount.resolveAccountNumber(
        data.accountNumber,
        data.bankCode,
      );
      resolvedName = resolved.accountName;
    } catch {
      // Non-fatal: use supplied name if Paystack resolve fails
      if (!resolvedName) {
        throw new BadRequestException(
          'Could not verify account number. Please check the account number and bank code.',
        );
      }
    }

    // 2. Create / refresh Paystack transfer recipient
    let paystackRecipientCode: string | null = null;
    try {
      const recipient =
        await this.paystackAccount.createVendorTransferRecipient({
          name: resolvedName,
          accountNumber: data.accountNumber,
          bankCode: data.bankCode,
          description: `Vendor payout — ${store.name}`,
        });
      paystackRecipientCode = recipient.recipientCode;
    } catch {
      /* persist account even if Paystack is temporarily unavailable */
    }

    // 3. Create / refresh Paystack subaccount for split-payment settlement
    //    Vendor gets (100 − platformCommission)% of each order
    const vendorPercentage = Math.max(0, 100 - (store.commissionRate ?? 10));
    let paystackSubaccountCode: string | null =
      store.paystackSubaccountCode ?? null;
    try {
      if (paystackSubaccountCode) {
        // Update the existing subaccount with new bank details if needed
        const updated = await this.paystackAccount.updateVendorSubaccount(
          paystackSubaccountCode,
          {
            bankCode: data.bankCode,
            accountNumber: data.accountNumber,
            percentageCharge: vendorPercentage,
          },
        );
        paystackSubaccountCode = updated.subaccountCode;
      } else {
        const sub = await this.paystackAccount.createVendorSubaccount({
          businessName: store.name,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          percentageCharge: vendorPercentage,
          description: `Asoose vendor — ${store.name}`,
        });
        paystackSubaccountCode = sub.subaccountCode;
      }
    } catch {
      /* non-fatal */
    }

    if (paystackSubaccountCode) {
      await this.prisma.store.update({
        where: { id: store.id },
        data: { paystackSubaccountCode },
      });
    }

    const existing = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
    });

    const bankData = {
      bankName: data.bankName,
      bankCode: data.bankCode,
      accountNumber: data.accountNumber,
      accountName: resolvedName,
      ...(paystackRecipientCode && { paystackRecipientCode }),
    };

    const select = {
      bankName: true,
      bankCode: true,
      accountNumber: true,
      accountName: true,
      paystackRecipientCode: true,
    } as const;

    if (existing) {
      const saved = await this.prisma.bankAccount.update({
        where: { storeId: store.id },
        data: bankData,
        select,
      });

      // Notify vendor of update
      try {
        const vendor = await this.prisma.vendor.findUnique({
          where: { id: vendorId },
        });
        if (vendor) {
          await this.securityNotifications.notifyBankAccountUpdated(
            vendor.id,
            vendor.email,
            vendor.name,
            saved.bankName,
            saved.accountNumber,
          );
        }
      } catch (error) {
        this.appLogger.error(
          'Failed to send bank account update notification',
          error?.stack,
          { error },
        );
      }

      return saved;
    }

    const newBankAccount = await this.prisma.bankAccount.create({
      data: { storeId: store.id, ...bankData },
      select,
    });

    // Notify vendor of new account
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });
      if (vendor) {
        await this.securityNotifications.notifyBankAccountAdded(
          vendor.id,
          vendor.email,
          vendor.name,
          data.bankName,
          data.accountNumber,
        );
      }
    } catch (error) {
      this.appLogger.error(
        'Failed to send bank account notification',
        error?.stack,
        { error },
      );
    }

    return newBankAccount;
  }

  // Update bank account (partial update — re-verifies and refreshes Paystack codes)
  async updateBankAccount(
    vendorId: string,
    data: {
      bankName?: string;
      bankCode?: string;
      accountNumber?: string;
      accountName?: string;
    },
  ) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) throw new Error('Store not found');

    const existing = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
    });
    if (!existing) throw new Error('Bank account not found');

    const bankCode = data.bankCode || existing.bankCode;
    const accountNumber = data.accountNumber || existing.accountNumber;

    // Re-verify if account or bank changed
    let accountName = data.accountName || existing.accountName;
    if (data.accountNumber || data.bankCode) {
      try {
        const resolved = await this.paystackAccount.resolveAccountNumber(
          accountNumber,
          bankCode,
        );
        accountName = resolved.accountName;
      } catch {
        /* use existing if resolve fails */
      }
    }

    // Refresh transfer recipient
    let paystackRecipientCode = existing.paystackRecipientCode;
    if (data.accountNumber || data.bankCode) {
      try {
        const recipient =
          await this.paystackAccount.createVendorTransferRecipient({
            name: accountName,
            accountNumber,
            bankCode,
          });
        paystackRecipientCode = recipient.recipientCode;
      } catch {
        /* non-fatal */
      }
    }

    const select = {
      bankName: true,
      bankCode: true,
      accountNumber: true,
      accountName: true,
      paystackRecipientCode: true,
    } as const;

    const updated = await this.prisma.bankAccount.update({
      where: { storeId: store.id },
      data: {
        ...(data.bankName && { bankName: data.bankName }),
        bankCode,
        accountNumber,
        accountName,
        ...(paystackRecipientCode && { paystackRecipientCode }),
      },
      select,
    });

    // Notify
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });
      if (vendor) {
        await this.securityNotifications.notifyBankAccountUpdated(
          vendor.id,
          vendor.email,
          vendor.name,
          updated.bankName,
          updated.accountNumber,
        );
      }
    } catch (error) {
      this.appLogger.error(
        'Failed to send bank account update notification',
        error?.stack,
        { error },
      );
    }

    return updated;
  }

  // Delete bank account
  async deleteBankAccount(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) throw new Error('Store not found');

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    const bankName = bankAccount.bankName;

    await this.prisma.bankAccount.delete({
      where: { storeId: store.id },
    });

    // Send notification for bank account deletion
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });
      if (vendor) {
        await this.securityNotifications.notifyBankAccountDeleted(
          vendor.id,
          vendor.email,
          vendor.name,
          bankName,
        );
      }
    } catch (error) {
      this.appLogger.error(
        'Failed to send bank account deletion notification',
        error?.stack,
        { error },
      );
    }

    return { message: 'Bank account deleted successfully' };
  }

  // Get withdrawal history
  async getWithdrawals(vendorId: string) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) return [];

    const withdrawals = await this.prisma.vendorPayout.findMany({
      where: { storeId: store.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // Get bank account details for each withdrawal
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
    });

    return withdrawals.map((w) => ({
      id: w.id,
      amount: w.amount,
      status: w.status,
      bankName: bankAccount?.bankName || 'N/A',
      accountNumber: bankAccount?.accountNumber || 'N/A',
      createdAt: w.createdAt.toISOString(),
      processedAt: w.processedAt?.toISOString(),
      rejectionReason: w.rejectionReason,
      referenceNumber: w.reference,
    }));
  }

  async createWithdrawal(
    vendorId: string,
    data: { amount: number; bankAccountId: string },
  ) {
    this.appLogger.log(`[DEV] createWithdrawal called`, { vendorId, data });

    // 1. Fetch Store & Bank Account
    const store = await this.prisma.store.findUnique({
      where: { vendorId },
      select: { id: true, walletBalance: true, commissionRate: true }, // ✅ Include commission
    });

    this.appLogger.log(`[DEV] Store lookup result`, { store });

    if (!store) throw new NotFoundException('Store not found');

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: data.bankAccountId },
    });

    this.appLogger.log(`[DEV] Bank account lookup result`, {
      bankAccount,
      storeIdMatch: bankAccount?.storeId === store.id,
    });

    if (!bankAccount || bankAccount.storeId !== store.id) {
      throw new BadRequestException('Invalid bank account');
    }

    // 2. Calculate Commission
    const commissionRate = store.commissionRate ?? 20;
    const commissionAmount = data.amount * (commissionRate / 100);
    const netAmount = data.amount - commissionAmount; // Amount vendor receives after commission

    this.appLogger.log(`[DEV] Commission breakdown`, {
      commissionRate,
      commissionAmount,
      netAmount,
      walletBalance: store.walletBalance,
      requestedAmount: data.amount,
    });

    // 3. Validate Balance
    const minWithdrawal = 5000;
    if (data.amount < minWithdrawal) {
      throw new BadRequestException(
        `Minimum withdrawal is ₦${minWithdrawal.toLocaleString()}`,
      );
    }

    if (store.walletBalance < data.amount) {
      throw new BadRequestException('Insufficient wallet balance');
    }

    const withdrawal = await this.prisma.vendorPayout.create({
      data: {
        storeId: store.id,
        bankAccountId: data.bankAccountId,
        amount: netAmount, // Store net amount in payout (what vendor receives)
        method: 'BANK_TRANSFER',
        status: 'PENDING',
      },
    });

    this.appLogger.log(`[DEV] VendorPayout record created`, { withdrawal });

    try {
      this.appLogger.log(`[DEV] Calling ledger.recordPayoutRequest`, {
        vendorId,
        role: UserRole.VENDOR,
        amount: data.amount,
        payoutId: withdrawal.id,
      });
      await this.ledger.recordPayoutRequest(
        vendorId, // Pass vendorId so ledger can find store by vendorId
        UserRole.VENDOR,
        data.amount, // Deduct full amount from wallet
        withdrawal.id,
      );
      this.appLogger.log(`[DEV] Ledger recordPayoutRequest succeeded`);
    } catch (error) {
      // Rollback payout record if ledger fails
      await this.prisma.vendorPayout.delete({ where: { id: withdrawal.id } });
      this.appLogger.error(
        '[DEV] Ledger transaction failed for vendor withdrawal',
        error.stack,
        { error, message: error?.message },
      );
      throw new BadRequestException(
        'Failed to process withdrawal request. Please try again.',
      );
    }

    // 5. Initiate Paystack transfer
    try {
      let recipientCode = bankAccount.paystackRecipientCode;

      // Create recipient on-the-fly if not already stored
      if (!recipientCode) {
        const recipient =
          await this.paystackAccount.createVendorTransferRecipient({
            name: bankAccount.accountName,
            accountNumber: bankAccount.accountNumber,
            bankCode: bankAccount.bankCode,
          });
        recipientCode = recipient.recipientCode;
        await this.prisma.bankAccount.update({
          where: { id: bankAccount.id },
          data: { paystackRecipientCode: recipientCode },
        });
      }

      const transferRef = `vendor-payout-${withdrawal.id}-${Date.now()}`;
      const transfer = await this.paystackService.initiateTransfer(
        netAmount,
        recipientCode,
        transferRef,
        'Vendor payout withdrawal',
      );

      await this.prisma.vendorPayout.update({
        where: { id: withdrawal.id },
        data: {
          reference: transfer.transferCode ?? transferRef,
          status: transfer.success ? 'APPROVED' : 'PENDING',
        },
      });

      this.appLogger.log(`[DEV] Paystack transfer initiated`, {
        transferCode: transfer.transferCode,
        status: transfer.status,
      });
    } catch (error) {
      // Transfer failure is non-fatal: payout record stays PENDING for admin follow-up
      this.appLogger.error(
        '[DEV] Paystack transfer initiation failed for vendor withdrawal',
        error?.stack,
        { error, message: error?.message },
      );
    }

    // 6. Send Notification
    try {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: vendorId },
      });
      if (vendor) {
        await this.securityNotifications.notifyWithdrawalCreated(
          vendor.id,
          vendor.email,
          vendor.name,
          data.amount,
          bankAccount.bankName,
          bankAccount.accountNumber,
        );
      }
    } catch (error) {
      this.appLogger.error(
        'Failed to send withdrawal notification',
        error?.stack,
        { error },
      );
    }

    return {
      id: withdrawal.id,
      message: 'Withdrawal request submitted successfully',
      status: 'PENDING',
      requestedAmount: data.amount,
      commissionRate,
      commissionAmount,
      netAmount,
      balance: store.walletBalance - data.amount,
    };
  }

  async requestAccountDeletion(
    vendorId: string,
    data: { reasons: string[]; additionalInfo?: string },
  ) {
    // Check if vendor exists
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        id: true,
        email: true,
        name: true,
        deletionStatus: true,
      },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    if (vendor.deletionStatus === 'PENDING') {
      throw new Error('Account deletion request already pending');
    }

    if (vendor.deletionStatus === 'APPROVED') {
      throw new Error('Account is already scheduled for deletion');
    }

    // Update vendor with deletion request
    await this.prisma.vendor.update({
      where: { id: vendorId },
      data: {
        deletionStatus: 'PENDING',
        deletionRequestedAt: new Date(),
        deletionReasons: data.reasons,
        deletionAdditionalInfo: data.additionalInfo,
      },
    });

    // Send notification for account deletion request
    try {
      await this.securityNotifications.notifyAccountDeletionRequested(
        vendor.id,
        vendor.email,
        vendor.name,
      );
    } catch (error) {
      this.appLogger.error(
        'Failed to send deletion request notification',
        error?.stack,
        { error },
      );
    }

    return {
      message:
        'Account deletion request submitted. You will be notified once admin reviews your request.',
      status: 'PENDING',
    };
  }

  async getAccountDeletionStatus(vendorId: string) {
    const vendor = await this.prisma.vendor.findUnique({
      where: { id: vendorId },
      select: {
        deletionStatus: true,
        deletionRequestedAt: true,
        deletionReasons: true,
      },
    });

    if (!vendor) {
      throw new Error('Vendor not found');
    }

    return {
      isPendingDeletion: vendor.deletionStatus === 'PENDING',
      deletionRequestedAt: vendor.deletionRequestedAt,
      reasons: vendor.deletionReasons,
    };
  }
}
