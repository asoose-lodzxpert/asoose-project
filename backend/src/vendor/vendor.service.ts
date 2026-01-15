import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NubanService } from '../libs/nuban/nuban.service';

@Injectable()
export class VendorService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly nubanService: NubanService,
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
        createdAt: true,
        updatedAt: true,
      },
    });
    return store;
  }

  async updateVendorImage(vendorId: string, imageUrl: string) {
    const vendor = await this.prisma.vendor.update({
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
    return vendor;
  }

  async getStoreBalance(vendorId: string) {
    const store = await this.prisma.store.findUnique({
      where: { vendorId },
      select: { balance: true },
    });
    return { amount: store?.balance ?? 0 };
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
    const orders = await this.prisma.order.findMany({
      where: {
        storeId: store.id,
        createdAt: { gte: today },
      },
    });
    const todaysOrders = orders.length;
    const todaysSales = orders.reduce((sum, o) => sum + (o.total || 0), 0);

    const pendingApprovals = await this.prisma.order.count({
      where: { storeId: store.id, status: 'PENDING' },
    });
    const avgRating = Math.round(store.rating || 0);
    return { todaysOrders, todaysSales, pendingApprovals, avgRating };
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
      where: { storeId: store.id },
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
      })),
      total: order.total,
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
        accountNumber: true,
        accountName: true,
      },
    });

    return bankAccount ? [bankAccount] : [];
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
      },
    });

    return bankAccount;
  }

  // Get all Nigerian banks
  async getBanks() {
    const banks = await this.prisma.bank.findMany({
      where: { isActive: true },
      select: {
        id: true,
        name: true,
        code: true,
      },
      orderBy: { name: 'asc' },
    });
    return banks;
  }

  // Verify account number using NUBAN API
  async verifyAccountNumber(bankCode: string, accountNumber: string) {
    return await this.nubanService.verifyAccountNumber(bankCode, accountNumber);
  }

  // Save (create or update) bank account
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

    // Check if bank account already exists
    const existing = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
    });

    if (existing) {
      // Update existing
      return await this.prisma.bankAccount.update({
        where: { storeId: store.id },
        data: {
          bankName: data.bankName,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
        },
        select: {
          bankName: true,
          bankCode: true,
          accountNumber: true,
          accountName: true,
        },
      });
    } else {
      // Create new
      return await this.prisma.bankAccount.create({
        data: {
          storeId: store.id,
          bankName: data.bankName,
          bankCode: data.bankCode,
          accountNumber: data.accountNumber,
          accountName: data.accountName,
        },
        select: {
          bankName: true,
          bankCode: true,
          accountNumber: true,
          accountName: true,
        },
      });
    }
  }

  // Update bank account
  async updateBankAccount(
    vendorId: string,
    data: {
      bankName?: string;
      accountNumber?: string;
      accountName?: string;
    },
  ) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) throw new Error('Store not found');

    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { storeId: store.id },
    });

    if (!bankAccount) {
      throw new Error('Bank account not found');
    }

    return await this.prisma.bankAccount.update({
      where: { storeId: store.id },
      data,
      select: {
        bankName: true,
        accountNumber: true,
        accountName: true,
      },
    });
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

    await this.prisma.bankAccount.delete({
      where: { storeId: store.id },
    });

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

  // Create withdrawal request
  async createWithdrawal(
    vendorId: string,
    data: { amount: number; bankAccountId: string },
  ) {
    const store = await this.prisma.store.findUnique({ where: { vendorId } });
    if (!store) throw new Error('Store not found');

    // Check if vendor has sufficient balance
    if (store.balance < data.amount) {
      throw new Error('Insufficient balance');
    }

    // Verify bank account belongs to this store
    const bankAccount = await this.prisma.bankAccount.findUnique({
      where: { id: data.bankAccountId },
    });

    if (!bankAccount || bankAccount.storeId !== store.id) {
      throw new Error('Invalid bank account');
    }

    // Create withdrawal request
    const withdrawal = await this.prisma.vendorPayout.create({
      data: {
        storeId: store.id,
        bankAccountId: data.bankAccountId,
        amount: data.amount,
        method: 'BANK_TRANSFER',
        status: 'PENDING',
      },
    });

    // Deduct from store balance immediately (pending approval)
    await this.prisma.store.update({
      where: { id: store.id },
      data: { balance: { decrement: data.amount } },
    });

    return {
      id: withdrawal.id,
      message: 'Withdrawal request submitted successfully',
      status: 'PENDING',
    };
  }
}
