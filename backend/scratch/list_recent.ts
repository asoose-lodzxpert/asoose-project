
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  
  console.log('Recent Rides:');
  const recentRides = await prisma.ride.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, createdAt: true }
  });
  console.log(JSON.stringify(recentRides, null, 2));

  console.log('\nRecent Deliveries:');
  const recentDeliveries = await prisma.delivery.findMany({
    take: 5,
    orderBy: { createdAt: 'desc' },
    select: { id: true, status: true, createdAt: true }
  });
  console.log(JSON.stringify(recentDeliveries, null, 2));
}

main().catch(console.error);
