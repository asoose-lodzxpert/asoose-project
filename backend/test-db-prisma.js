const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  try {
    console.log('Connecting to database via Prisma...');
    await prisma.$connect();
    console.log('Connected successfully!');
    const res = await prisma.$queryRaw`SELECT NOW()`;
    console.log('Query result:', res);
    await prisma.$disconnect();
  } catch (err) {
    console.error('Connection failed:', err.message);
    process.exit(1);
  }
}

test();
