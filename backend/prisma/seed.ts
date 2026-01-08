// as/backend/prisma/fix-vendors.ts
import { PrismaClient, VerificationStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const updated = await prisma.store.updateMany({
    where: { status: 'ACTIVE' },
    data: { verification: VerificationStatus.VERIFIED },
  });
  console.log(`✅ Updated ${updated.count} stores to VERIFIED status.`);
}

main()
  .catch((e) => console.error(e))
  .finally(async () => await prisma.$disconnect());