// 04-payouts.ts
import { prisma } from './seed-utils';
import { PayoutStatus, TransactionType, WalletEntityType, TransactionStatus } from '@prisma/client';

export async function seedPayouts() {
  console.log('🌱 Seeding Payout Requests...');

  // --- Vendor Payouts ---
  // Fetch stores with balance > 0
  const stores = await prisma.store.findMany({ 
    where: { walletBalance: { gt: 0 } },
    include: { bankAccount: true },
    take: 5 
  });

  const statuses = [PayoutStatus.PENDING, PayoutStatus.APPROVED, PayoutStatus.COMPLETED, PayoutStatus.REJECTED, PayoutStatus.FAILED];

  for (const [index, store] of stores.entries()) {
    const amount = 1000.00; // Fixed withdrawal amount
    const status = statuses[index % statuses.length];

    // 1. Create Payout Record
    const payout = await prisma.vendorPayout.create({
      data: {
        storeId: store.id,
        amount: amount,
        status: status,
        bankAccountId: store.bankAccount?.id,
        method: 'BANK_TRANSFER',
        reference: `PAY_REF_${Date.now()}_${index}`,
        processedAt: status === PayoutStatus.COMPLETED ? new Date() : null,
      }
    });

    // 2. Handle Ledger & Balance Logic
    // If Pending/Approved/Completed, money leaves the wallet (or is locked)
    // If Rejected/Failed, money should theoretically return, but for the seed we assume
    // the deduction happened at request time.
    
    if (status !== PayoutStatus.REJECTED) {
      const currentBalance = store.walletBalance; // Should reflect the update from step 3
      
      // Create Transaction for the Payout Request
      await prisma.transaction.create({
        data: {
          type: TransactionType.PAYOUT_REQUESTED,
          amount: -amount, // Negative for deduction
          entityType: WalletEntityType.STORE,
          entityId: store.id,
          vendorPayoutId: payout.id,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance - amount,
          description: `Payout Request ${status}`,
          status: TransactionStatus.COMPLETED, // The request transaction is complete
        }
      });

      // Deduct from Wallet
      await prisma.store.update({
        where: { id: store.id },
        data: { walletBalance: { decrement: amount } }
      });
    }
  }

  // --- Rider Payouts ---
  const riders = await prisma.rider.findMany({ 
    where: { walletBalance: { gt: 0 } },
    take: 5 
  });

  for (const [index, rider] of riders.entries()) {
    const amount = 500.00;
    const status = statuses[index % statuses.length];

    const payout = await prisma.riderPayout.create({
      data: {
        riderId: rider.id,
        amount: amount,
        status: status,
        method: 'BANK_TRANSFER',
        reference: `RIDER_PAY_${Date.now()}_${index}`,
      }
    });

    if (status !== PayoutStatus.REJECTED) {
      await prisma.transaction.create({
        data: {
          type: TransactionType.PAYOUT_REQUESTED,
          amount: -amount,
          entityType: WalletEntityType.RIDER,
          entityId: rider.id,
          riderPayoutId: payout.id,
          balanceBefore: rider.walletBalance,
          balanceAfter: rider.walletBalance - amount,
          description: `Rider Payout ${status}`,
          status: TransactionStatus.COMPLETED,
        }
      });

      await prisma.rider.update({
        where: { id: rider.id },
        data: { walletBalance: { decrement: amount } }
      });
    }
  }
}