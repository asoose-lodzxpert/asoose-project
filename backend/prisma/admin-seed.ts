import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as argon2 from 'argon2';
import { ARGON2_OPTIONS } from './seed-utils';

async function seedAdmin(prisma: PrismaClient) {
  const email = 'asoose-admin@asoose.com';
  const passwordRaw = 'AdminPassword123!';
  const hashedPassword = await argon2.hash(passwordRaw, ARGON2_OPTIONS);

  console.log(`🌱 Seeding Admin User: ${email}...`);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      verificationStatus: 'VERIFIED',
    },
    create: {
      email,
      name: 'ASOOSE Admin',
      password: hashedPassword,
      role: UserRole.SUPER_ADMIN,
      status: UserStatus.ACTIVE,
      verificationStatus: 'VERIFIED',
    },
  });

  console.log(`✅ Admin user configured:`);
  console.log({
    id: admin.id,
    email: admin.email,
    role: admin.role,
    status: admin.status,
    verificationStatus: admin.verificationStatus,
  });

  console.log(`\n📋 Login Credentials:`);
  console.log({
    email: admin.email,
    password: passwordRaw,
  });
}

export { seedAdmin };
