import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🔍 Checking for test accounts...\n');

  // Check Users (Customers/Admins)
  const users = await prisma.user.findMany({
    where: {
      email: {
        contains: 'tester',
        mode: 'insensitive',
      },
    },
    select: { email: true, role: true, status: true },
  });

  // Check Vendors
  const vendors = await prisma.vendor.findMany({
    where: {
      email: {
        contains: 'tester',
        mode: 'insensitive',
      },
    },
    select: { email: true, status: true, store: { select: { name: true, status: true } } },
  });

  // Check Riders
  const riders = await prisma.rider.findMany({
    where: {
      email: {
        contains: 'tester',
        mode: 'insensitive',
      },
    },
    select: { email: true, status: true, isOnline: true },
  });

  console.log('👤 Users (Customers/Admins):');
  console.table(users);

  console.log('\n🏪 Vendors:');
  vendors.forEach(v => {
    console.log(`- ${v.email} | Status: ${v.status} | Store: ${v.store?.name} (${v.store?.status})`);
  });

  console.log('\n🚴 Riders:');
  console.table(riders);

  await prisma.$disconnect();
}

main();
