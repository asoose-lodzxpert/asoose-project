import { PrismaClient, UserRole, UserStatus } from '@prisma/client';
import * as bcrypt from 'bcrypt';

async function seedAdmin(prisma: PrismaClient) {
  const email = 'asoose-admin@asoose.com';
  const passwordRaw = 'AdminPassword123!'; // Change this to your desired password
  const hashedPassword = await bcrypt.hash(passwordRaw, 10);

  console.log(`🌱 Seeding Admin User: ${email}...`);

  const admin = await prisma.user.upsert({
    where: { email },
    update: {
      role: UserRole.ADMIN,
      status: UserStatus.ACTIVE,
      verificationStatus: 'VERIFIED',
    },
    create: {
      email,
      name: 'ASOOSE Admin',
      password: hashedPassword,
      role: UserRole.ADMIN,
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
