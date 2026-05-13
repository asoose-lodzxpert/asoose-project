// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const riders = await prisma.rider.findMany({
    where: {
      OR: [
        { name: { contains: 'has', mode: 'insensitive' } },
        { email: { contains: 'has', mode: 'insensitive' } }
      ]
    }
  });
  console.log("Riders containing 'has':", riders.map(r => ({ name: r.name, email: r.email, wallet: r.walletBalance, rides: r.totalRides })));
}

main().catch(console.error).finally(() => prisma.$disconnect());
