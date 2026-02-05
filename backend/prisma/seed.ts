// seed.ts
import { prisma, cleanDatabase } from './seed-utils';
import { seedAddresses } from './01-address';
import { seedUsersAndRiders } from './02-users-riders';
import { seedVendorsAndProducts } from './03-vendors-products';
import { seedWalletsAndTransactions } from './04-wallets-transactions';
import { seedPayouts } from './05-payouts';
import { seedDisputes } from './06-disputes';
import { seedVerificationQueue } from './07-verification';
import { seedBanks } from './08-bank';

async function main() {
  // await cleanDatabase(); // Optional

  await seedAddresses();
  await seedUsersAndRiders();
  await seedVendorsAndProducts();
  await seedWalletsAndTransactions();
  await seedPayouts();

  await seedDisputes();
  await seedVerificationQueue();
  await seedBanks();

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
