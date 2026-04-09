import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Store City Migration Script ---');

  // 1. Ensure Maiduguri city exists and is active
  const city = await prisma.city.upsert({
    where: { name: 'Maiduguri' },
    update: { state: 'Borno', isActive: true },
    create: { name: 'Maiduguri', state: 'Borno', isActive: true },
  });

  console.log(`Using city: ${city.name} (ID: ${city.id}, State: ${city.state})`);

  // 2. Update all stores that don't have a cityId
  const result = await prisma.store.updateMany({
    where: {
      cityId: null,
    },
    data: {
      cityId: city.id,
    },
  });

  console.log(`Updated ${result.count} stores to resolve to ${city.name}.`);

  // 3. Optional: Verify if any stores are still without cityId
  const remaining = await prisma.store.count({
    where: {
      cityId: null,
    },
  });

  if (remaining > 0) {
    console.warn(`Warning: ${remaining} stores still have no cityId assigned.`);
  } else {
    console.log('All stores now have a cityId.');
  }
}

main()
  .catch((e) => {
    console.error('Migration error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
