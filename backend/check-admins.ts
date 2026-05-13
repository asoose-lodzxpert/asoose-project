// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const adminId = '46d7095b-c623-4575-95dc-6b8c949f7f93';
  
  const admin = await prisma.user.findUnique({
    where: { id: adminId },
    select: { name: true, email: true, role: true }
  });

  console.log("Admin who made all the adjustments:");
  console.log(admin);
}

main().catch(console.error).finally(() => prisma.$disconnect());
