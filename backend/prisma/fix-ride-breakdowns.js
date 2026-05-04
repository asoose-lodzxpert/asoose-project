const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rides = await prisma.ride.findMany({
    where: {
      OR: [
        { baseFare: null },
        { distanceFare: null }
      ]
    }
  });

  console.log(`Found ${rides.length} rides to fix.`);

  for (const ride of rides) {
    const total = ride.totalFare || ride.scheduledFare || 0;
    if (total === 0) continue;

    // Simple heuristic breakdown if we don't want to re-run complex logic
    // Platform fee is usually 20%
    const platformFee = Math.round(total * 0.2);
    const baseFare = 500; // default base
    const distanceFare = Math.max(0, total - baseFare - platformFee);

    await prisma.ride.update({
      where: { id: ride.id },
      data: {
        baseFare,
        distanceFare,
        timeFare: 0,
        platformFee,
        driverFee: total - platformFee
      }
    });
    console.log(`Fixed ride ${ride.id}`);
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
