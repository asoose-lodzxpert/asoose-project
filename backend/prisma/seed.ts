// prisma/reset-admin.ts
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const email = 'admin@super.com';
  const newPassword = 'password123';
  
  // 1. Hash the password using the same library your app uses
  const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash(newPassword, salt);

  console.log(`🔐 Resetting password for ${email}...`);

  // 2. Update the user
  const user = await prisma.user.update({
    where: { email },
    data: {
      password: hashedPassword,
      role: 'SUPER_ADMIN', // Ensure role is correct
      status: 'ACTIVE'
    },
  });

  console.log('✅ Password updated successfully!');
  console.log('-------------------------------------------');
  console.log(`📧 Email:    ${email}`);
  console.log(`🔑 Password: ${newPassword}`);
  console.log('-------------------------------------------');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });