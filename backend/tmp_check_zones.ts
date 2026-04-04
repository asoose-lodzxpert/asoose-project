import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
    const zones = await prisma.serviceZone.findMany({ where: { isActive: true } });
    console.log(JSON.stringify(zones, null, 2));
}
main().finally(() => prisma.$disconnect());
