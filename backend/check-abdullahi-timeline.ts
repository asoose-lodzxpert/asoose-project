// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const riderId = 'b3ced4c4-e2dc-48fd-8fda-5de8bc3013cf';
  
  const txns = await prisma.transaction.findMany({
    where: { entityId: riderId },
    orderBy: { createdAt: 'asc' }
  });

  console.log("TIMELINE OF TRANSACTIONS:");
  for (const t of txns) {
    let effect = "";
    if (t.type === 'PAYOUT_REQUESTED') effect = `DEBIT (-)`;
    else if (t.type === 'RIDER_EARNING' || t.type === 'PAYOUT_FAILED') effect = `CREDIT (+)`;
    else if (t.type === 'ADJUSTMENT') {
      // Adjustment amount can be positive or negative
      effect = t.amount > 0 ? `CREDIT (+)` : `DEBIT (-)`;
    } else {
      effect = `NEUTRAL (0)`;
    }

    console.log(`[${new Date(t.createdAt).toISOString().split('T')[0]}] ${t.type.padEnd(16)} | Amt: ₦${t.amount.toString().padEnd(6)} | Effect: ${effect} | Bal. After: ₦${t.balanceAfter} | Desc: ${t.description}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
