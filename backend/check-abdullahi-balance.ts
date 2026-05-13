// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const riderId = 'b3ced4c4-e2dc-48fd-8fda-5de8bc3013cf';
  
  const rider = await prisma.rider.findUnique({
    where: { id: riderId },
    include: {
      rides: {
        orderBy: { createdAt: 'desc' }
      },
      payouts: true
    }
  });

  console.log(`Wallet Balance: ₦${rider.walletBalance}`);
  
  console.log(`\nRides Data:`);
  for (const ride of rider.rides) {
    console.log(`- Ride ${ride.id} (${ride.status}): TotalFare=₦${ride.totalFare}, DriverFee=₦${ride.driverFee}, PlatformFee=₦${ride.platformFee}`);
  }

  console.log(`\nPayouts:`);
  for (const p of rider.payouts) {
    console.log(`- Payout ${p.id} (${p.status}): Amount=₦${p.amount}, Date=${p.createdAt}`);
  }

  const txns = await prisma.transaction.findMany({
    where: {
      entityId: riderId
    },
    orderBy: { createdAt: 'desc' }
  });

  console.log(`\nLedger / Transactions:`);
  let calculatedBalance = 0;
  for (const t of txns) {
    console.log(`- Txn ${t.id} (${t.type}): Amount=₦${t.amount}, RideId=${t.rideId}, PayoutId=${t.riderPayoutId}`);
    calculatedBalance += t.amount;
  }
  console.log(`Calculated sum of transactions: ₦${calculatedBalance}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
