/**
 * cancel-stuck-rides.ts
 *
 * One-off admin script to cancel rides stuck in non-terminal states.
 * This is useful when rides get orphaned due to bugs (e.g., premature confirmRide calls).
 *
 * Usage:
 *   npx ts-node prisma/cancel-stuck-rides.ts          # cancel REQUESTED/SEARCHING/ASSIGNED/ACCEPTED/PAID
 *   npx ts-node prisma/cancel-stuck-rides.ts --force   # also cancel IN_PROGRESS (use with caution!)
 *
 * Requires DATABASE_URL in .env (same as Prisma).
 */

import { PrismaClient, RideStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const force = process.argv.includes('--force');

  const stuckStatuses: RideStatus[] = [
    'REQUESTED' as RideStatus,
    'SEARCHING_DRIVER' as RideStatus,
    'DRIVER_ASSIGNED' as RideStatus,
    'DRIVER_ACCEPTED' as RideStatus,
    'PAID' as RideStatus,
  ];

  if (force) {
    stuckStatuses.push('IN_PROGRESS' as RideStatus);
    console.log('⚠️  --force flag detected: IN_PROGRESS rides will also be cancelled.');
  }

  console.log(`\nLooking for rides in statuses: ${stuckStatuses.join(', ')}...\n`);

  const stuckRides = await prisma.ride.findMany({
    where: {
      status: { in: stuckStatuses },
    },
    select: {
      id: true,
      status: true,
      customerId: true,
      createdAt: true,
      updatedAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  if (stuckRides.length === 0) {
    console.log('✅ No stuck rides found. Nothing to do.');
    return;
  }

  console.log(`Found ${stuckRides.length} stuck ride(s):\n`);
  for (const ride of stuckRides) {
    const age = Math.round(
      (Date.now() - new Date(ride.updatedAt).getTime()) / 60_000,
    );
    console.log(
      `  - ${ride.id} | ${ride.status} | customer=${ride.customerId} | last updated ${age} min ago`,
    );
  }

  console.log(`\nCancelling ${stuckRides.length} ride(s)...\n`);

  let cancelled = 0;
  for (const ride of stuckRides) {
    try {
      await prisma.ride.update({
        where: { id: ride.id },
        data: { status: 'CANCELLED_BY_SYSTEM' as RideStatus },
      });
      console.log(`  ✅ ${ride.id} → CANCELLED_BY_SYSTEM (was ${ride.status})`);
      cancelled++;
    } catch (err) {
      console.error(`  ❌ Failed to cancel ${ride.id}:`, err);
    }
  }

  console.log(`\nDone. Cancelled ${cancelled}/${stuckRides.length} ride(s).`);
}

main()
  .catch((e) => {
    console.error('Script failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
