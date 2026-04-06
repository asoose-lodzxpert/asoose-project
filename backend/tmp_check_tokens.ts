
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const tokens = await prisma.pushToken.findMany({
    take: 20,
    orderBy: { createdAt: 'desc' },
  });
  console.log(JSON.stringify(tokens, null, 2));
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
