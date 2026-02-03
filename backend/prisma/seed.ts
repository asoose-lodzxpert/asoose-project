// seed.ts
import { prisma, cleanDatabase } from './seed-utils';
import { seedUsersAndRiders } from './01-users-riders';
import { seedVendorsAndProducts } from './02-vendors-products';
import { seedWalletsAndTransactions } from './03-wallets-transactions';
import { seedPayouts } from './04-payouts';
import { seedDisputes } from './05-disputes'; // NEW
import { seedVerificationQueue } from './06-verification'; // NEW

async function main() {
  // await cleanDatabase(); // Optional

  await seedUsersAndRiders();
  await seedVendorsAndProducts();
  await seedWalletsAndTransactions();
  await seedPayouts();

  // New modules
  await seedDisputes();
  await seedVerificationQueue();

  console.log('✅ Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
