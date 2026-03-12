import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const r = await prisma.product.updateMany({
    where: { storeId: '20a1cc55-2c1e-4ef8-8a43-c6b18589022a' },
    data: { stock: 10000 },
  });
  console.log('Updated:', r.count, 'products → stock set to 10000');
}
main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
