// @ts-nocheck
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const riderId = 'b3ced4c4-e2dc-48fd-8fda-5de8bc3013cf';
  const txns = await prisma.transaction.findMany({
    where: { entityId: riderId, type: 'ADJUSTMENT' }
  });
  console.log(txns.map(t => ({ id: t.id, amount: t.amount, balanceBefore: t.balanceBefore, balanceAfter: t.balanceAfter })));
}
main().catch(console.error).finally(() => prisma.$disconnect());
