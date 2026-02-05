// 03-wallets-transactions.ts
import { prisma } from './seed-utils';
import {
  TransactionType,
  WalletEntityType,
  TransactionStatus,
  OrderStatus,
  PaymentStatus,
  PaymentMethod,
  UserRole,
} from '@prisma/client';

export async function seedWalletsAndTransactions() {
  console.log('🌱 Seeding Orders, Transactions and Wallets...');

  const stores = await prisma.store.findMany({ take: 5 });
  const riders = await prisma.rider.findMany({ take: 5 });
  const customer = await prisma.user.findFirst({
    where: { role: UserRole.CUSTOMER },
  });

  if (!customer || stores.length === 0 || riders.length === 0) {
    throw new Error('❌ Run Users and Vendors seeds first.');
  }

  // --- Scenario: Generate Income for Stores and Riders ---

  for (const store of stores) {
    const orderTotal = 5000.0;
    const platformFee = orderTotal * 0.1; // 10%
    const vendorEarning = orderTotal - platformFee;

    // 1. Create a Completed Order
    const order = await prisma.order.create({
      data: {
        userId: customer.id,
        storeId: store.id,
        total: orderTotal,
        status: OrderStatus.DELIVERED,
        paymentStatus: 'PAID',
        deliveredAt: new Date(),
        items: {
          create: {
            nameSnap: 'Test Product',
            quantity: 2,
            price: 2500.0,
          },
        },
      },
    });

    // 2. Create Ledger Entry: Vendor Earning
    await prisma.transaction.create({
      data: {
        type: TransactionType.VENDOR_EARNING,
        amount: vendorEarning,
        entityType: WalletEntityType.STORE,
        entityId: store.id,
        orderId: order.id,
        balanceBefore: store.walletBalance,
        balanceAfter: store.walletBalance + vendorEarning,
        description: `Earnings for Order #${order.id.slice(0, 8)}`,
        status: TransactionStatus.COMPLETED,
      },
    });

    // 3. Update Store Wallet
    await prisma.store.update({
      where: { id: store.id },
      data: {
        walletBalance: { increment: vendorEarning },
        totalRevenue: { increment: orderTotal },
        totalOrders: { increment: 1 },
      },
    });
  }

  for (const rider of riders) {
    const rideFare = 2000.0;
    const riderCommission = rideFare * 0.2; // 20%
    const riderEarning = rideFare - riderCommission;

    // 1. Ledger Entry: Rider Earning (Simulating a completed ride)
    await prisma.transaction.create({
      data: {
        type: TransactionType.RIDER_EARNING,
        amount: riderEarning,
        entityType: WalletEntityType.RIDER,
        entityId: rider.id,
        balanceBefore: rider.walletBalance, // Assuming 0 start
        balanceAfter: rider.walletBalance + riderEarning,
        description: 'Ride Earnings',
        status: TransactionStatus.COMPLETED,
      },
    });

    // 2. Update Rider Wallet
    await prisma.rider.update({
      where: { id: rider.id },
      data: {
        walletBalance: { increment: riderEarning },
        totalRides: { increment: 1 },
      },
    });
  }
}
