
import { PrismaClient } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const deliveryId = 'c5710e0e-e3ec-4afc-aba4-6fa6dc22b59a';

  const delivery = await prisma.delivery.findUnique({
    where: { id: deliveryId },
    include: {
      dropoffAddress: true,
      rider: true
    }
  });

  console.log(JSON.stringify(delivery, null, 2));
}

main().catch(console.error);
