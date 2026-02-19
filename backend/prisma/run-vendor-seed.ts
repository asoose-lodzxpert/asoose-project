import { seedCategories } from './categories';
import { seedVendorsAndProducts } from './03-vendors-products';
import { prisma } from './seed-utils';

async function main() {
  await seedCategories();
  await seedVendorsAndProducts();
}

main()
  .catch((e) => {
    console.error('❌ Vendor seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
