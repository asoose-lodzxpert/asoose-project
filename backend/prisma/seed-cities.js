const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const cities = [
    { name: 'Maiduguri', state: 'Borno' },
    { name: 'Abuja', state: 'FCT' },
  ];

  for (const city of cities) {
    const result = await prisma.city.upsert({
      where: { name: city.name },
      update: { state: city.state, isActive: true },
      create: { name: city.name, state: city.state, isActive: true },
    });
    console.log(`Seeded: ${result.name} (${result.state}) — active: ${result.isActive}`);
  }

  const count = await prisma.city.count({ where: { isActive: true } });
  console.log(`Done. ${count} active cities.`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
