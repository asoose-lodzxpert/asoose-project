<<<<<<< HEAD
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
import { seedCategories } from './categories';
=======
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();
>>>>>>> payout

async function main() {
  const email = 'solomonpaul232@gmail.com';
  const passwordRaw = 'SuperAdmin123!'; 
  const hashedPassword = await bcrypt.hash(passwordRaw, 10);

<<<<<<< HEAD
  await seedAddresses();
  await seedCategories();
  await seedUsersAndRiders();
  await seedVendorsAndProducts();
  await seedWalletsAndTransactions();
  await seedPayouts();
=======
  console.log(`🌱 Seeding Super Admin: ${email}...`);
>>>>>>> payout

  const superAdmin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      verificationStatus: 'VERIFIED',
    },
    create: {
      email,
      name: 'Solomon Paul',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      verificationStatus: 'VERIFIED', // Correct field from your schema
      // isVerified: true, <--- REMOVED (This caused the error)
    },
  });

  console.log(`✅ Super Admin configured:`);
  console.log({
    id: superAdmin.id,
    email: superAdmin.email,
    role: superAdmin.role,
    status: superAdmin.status,
  });
}

main()
  .catch((e) => {
    console.error('❌ Error seeding Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });