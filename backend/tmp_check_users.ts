
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const riders = await prisma.rider.findMany({ take: 5 });
  const users = await prisma.user.findMany({ take: 5 });
  console.log('Riders:', JSON.stringify(riders, null, 2));
  console.log('Users:', JSON.stringify(users, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
