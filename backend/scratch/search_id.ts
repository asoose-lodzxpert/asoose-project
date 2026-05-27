
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const search = '710e0e';

  const rides = await prisma.ride.findMany({
    where: { id: { contains: search } }
  });

  const deliveries = await prisma.delivery.findMany({
    where: { id: { contains: search } }
  });

  console.log('Rides matching:', JSON.stringify(rides, null, 2));
  console.log('Deliveries matching:', JSON.stringify(deliveries, null, 2));
}

main().catch(console.error);
