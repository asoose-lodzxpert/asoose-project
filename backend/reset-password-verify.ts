import { PrismaClient } from '@prisma/client';
import { hashPassword, verifyPassword } from './src/auth/password-hash.util';

const prisma = new PrismaClient();

async function main() {
  const email = 'tester@asoose.com';
  const newPassword = 'AsooseReview2026!';
  
  console.log(`Phase 1: Hashing password...`);
  const hashedPassword = await hashPassword(newPassword);

  console.log(`Phase 2: Updating database...`);
  const updateVendor = await prisma.vendor.update({
    where: { email },
    data: { password: hashedPassword },
  });

  console.log(`Phase 3: Verifying immediately...`);
  const isMatch = await verifyPassword(newPassword, updateVendor.password);
  
  if (isMatch) {
    console.log(`SUCCESS: Password reset and verified for ${email}`);
  } else {
    console.error(`FAILURE: Password was updated but verification failed!`);
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
