/**
 * delete-old-transactions.ts
 *
 * One-off admin script: deletes all Transaction, RiderPayout, and VendorPayout
 * records created on or before 2026-03-08 (inclusive).
 *
 * Order:
 *   1. Delete Transactions first (FK to RiderPayout/VendorPayout is Restrict,
 *      so payouts can only be deleted after their linked transactions are gone).
 *   2. Delete RiderPayouts
 *   3. Delete VendorPayouts
 *
 * Usage:
 *   npx ts-node prisma/delete-old-transactions.ts
 *
 * Requires DATABASE_URL in .env (same as Prisma).
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Inclusive cutoff — anything on this day or earlier is deleted.
const CUTOFF = new Date('2026-03-09T00:00:00.000Z'); // strict lt → covers all of 2026-03-08

async function main() {
  console.log(
    `Deleting records with createdAt < ${CUTOFF.toISOString()} ...\n`,
  );

  // 1. Transactions
  const txResult = await prisma.transaction.deleteMany({
    where: { createdAt: { lt: CUTOFF } },
  });
  console.log(`✅ Deleted ${txResult.count} Transaction record(s)`);

  // 2. RiderPayouts
  const riderPayoutResult = await prisma.riderPayout.deleteMany({
    where: { createdAt: { lt: CUTOFF } },
  });
  console.log(`✅ Deleted ${riderPayoutResult.count} RiderPayout record(s)`);

  // 3. VendorPayouts
  const vendorPayoutResult = await prisma.vendorPayout.deleteMany({
    where: { createdAt: { lt: CUTOFF } },
  });
  console.log(`✅ Deleted ${vendorPayoutResult.count} VendorPayout record(s)`);

  console.log('\nDone.');
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
