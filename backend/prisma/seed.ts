import dotenv from 'dotenv';
import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';
import { seedAdmin } from './admin-seed';
import { seedBanks } from './08-bank';
import { seedServiceZones } from './09-service-zones';
import { seedCategories } from './categories';
import { seedVendorsAndProducts } from './03-vendors-products';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

async function main() {
  const email = 'solomonpaul232@gmail.com';
  const passwordRaw = 'SuperAdmin123!';
  const hashedPassword = await bcrypt.hash(passwordRaw, 10);

  console.log(`🌱 Seeding Super Admin: ${email}...`);

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

  // Seed Admin
  await seedAdmin(prisma);

}

main()
  .catch((e) => {
    console.error('❌ Error seeding Super Admin:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
