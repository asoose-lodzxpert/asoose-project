import { PrismaClient, UserStatus, StoreStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🛠️ Fixing test accounts...\n');

  // 1. Fix Vendor and Store
  const vendorEmail = 'tester@asoose.com';
  console.log(`🏪 Updating Vendor: ${vendorEmail}`);
  const vendor = await prisma.vendor.update({
    where: { email: vendorEmail },
    data: {
      status: UserStatus.ACTIVE,
      store: {
        update: {
          status: StoreStatus.ACTIVE,
          isOpen: true,
        }
      }
    },
    include: { store: true }
  });
  console.log(`✅ Vendor & Store are now ACTIVE. (Store: ${vendor.store?.name})`);

  // 2. Fix Rider
  const riderEmail = 'rider-tester@asoose.com';
  console.log(`\n🚴 Updating Rider: ${riderEmail}`);
  const rider = await prisma.rider.update({
    where: { email: riderEmail },
    data: {
      status: UserStatus.ACTIVE,
      isOnline: true,
    }
  });
  console.log(`✅ Rider is now ACTIVE.`);

  // 3. Ensure Customer Tester exists
  const customerEmail = 'customer-tester@asoose.com';
  console.log(`\n👤 Checking Customer: ${customerEmail}`);
  const existingCustomer = await prisma.user.findUnique({ where: { email: customerEmail } });
  
  if (existingCustomer) {
    await prisma.user.update({
      where: { email: customerEmail },
      data: { status: UserStatus.ACTIVE }
    });
    console.log('✅ Existing Customer reactivated.');
  } else {
    // Check if there are any example.com customers
    const otherCust = await prisma.user.findFirst({ where: { role: 'CUSTOMER' } });
    if (otherCust) {
        console.log(`💡 Found alternative customer: ${otherCust.email} (${otherCust.status})`);
        if (otherCust.status !== 'ACTIVE') {
            await prisma.user.update({ where: { id: otherCust.id }, data: { status: 'ACTIVE' } });
            console.log('✅ Alternative customer reactivated.');
        }
    } else {
        console.log('⚠️ No customers found. You might need to seed one.');
    }
  }

  await prisma.$disconnect();
}

main();
