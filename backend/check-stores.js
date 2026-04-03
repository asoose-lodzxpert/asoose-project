const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const stores = await prisma.store.findMany({
    select: { id: true, name: true, isAdminManaged: true },
  });
  console.log('Stores:', JSON.stringify(stores, null, 2));
  
  const recentOrders = await prisma.order.findMany({
    take: 10,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      paymentStatus: true,
      status: true,
      store: {
        select: {
          id: true,
          name: true,
          isAdminManaged: true,
        },
      },
    },
  });
  console.log('Recent Orders:', JSON.stringify(recentOrders, null, 2));
}

main().catch(console.error).finally(() => prisma.$disconnect());
