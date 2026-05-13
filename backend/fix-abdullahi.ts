// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { TransactionLedgerService } from './src/super-admin/transactions/transaction-ledger.service';

const prisma = new PrismaClient();
const ledger = new TransactionLedgerService(prisma);

async function main() {
  const riderId = 'b3ced4c4-e2dc-48fd-8fda-5de8bc3013cf';
  const adminId = '46d7095b-c623-4575-95dc-6b8c949f7f93'; // ASOOSE Admin

  // 1. Find PENDING payouts
  const pendingPayouts = await prisma.riderPayout.findMany({
    where: { riderId, status: 'PENDING' }
  });

  console.log(`Found ${pendingPayouts.length} PENDING payouts to reject.`);

  for (const p of pendingPayouts) {
    console.log(`Rejecting payout ${p.id} (Amt: ${p.amount})...`);
    // Finalize payout as FAILED (this refunds the wallet automatically via ledger)
    await ledger.finalizePayout(p.id, 'FAILED');
    
    // We also need to actually update the RiderPayout record status, 
    // because finalizePayout only updates the Ledger and Wallet!
    await prisma.riderPayout.update({
      where: { id: p.id },
      data: { status: 'FAILED' }
    });
  }

  // 2. Fetch the updated wallet balance after refunds
  const rider = await prisma.rider.findUnique({ where: { id: riderId } });
  console.log(`Wallet Balance after refunds: ₦${rider.walletBalance}`);

  // 3. Wipe the balance to 0 (since he has already over-withdrawn his true earnings)
  if (rider.walletBalance !== 0) {
    const adjustmentAmount = -rider.walletBalance; // if balance is 25400, adjustment is -25400
    console.log(`Executing adjustment of ₦${adjustmentAmount} to zero out the wallet...`);
    
    await ledger.recordAdjustment({
      entityType: 'RIDER',
      entityId: riderId,
      amount: adjustmentAmount,
      reason: "Resetting wallet to 0 due to previous over-withdrawals and system corrections.",
      adminUserId: adminId
    });
  }

  const finalRider = await prisma.rider.findUnique({ where: { id: riderId } });
  console.log(`Final Wallet Balance: ₦${finalRider.walletBalance}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
