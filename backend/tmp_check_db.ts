
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  try {
    const rideFields = await prisma.$queryRaw`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'Ride'
    `;
    const expectedColumns = [
      { name: 'assignedBy', type: 'TEXT' },
      { name: 'assignmentWindowMin', type: 'INTEGER DEFAULT 90' },
      { name: 'cancellationDeadline', type: 'TIMESTAMP(3)' },
      { name: 'estimatedDurationMin', type: 'INTEGER' },
      { name: 'estimatedEndTime', type: 'TIMESTAMP(3)' },
      { name: 'isScheduled', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'lateCancellation', type: 'BOOLEAN NOT NULL DEFAULT false' },
      { name: 'scheduledAt', type: 'TIMESTAMP(3)' },
      { name: 'scheduledFare', type: 'DOUBLE PRECISION' }
    ];

    for (const col of expectedColumns) {
      const exists: any[] = await prisma.$queryRaw`
        SELECT column_name FROM information_schema.columns 
        WHERE table_name = 'Ride' AND column_name = ${col.name}
      `;
      if (exists.length === 0) {
        console.log(`Adding missing column ${col.name}...`);
        await prisma.$executeRawUnsafe(`ALTER TABLE "Ride" ADD COLUMN "${col.name}" ${col.type}`);
      } else {
        console.log(`Column ${col.name} already exists.`);
      }
    }

    const tables = await prisma.$queryRaw`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name IN ('DriverUnavailability', 'DriverShift', 'ScheduledRideReminder')
    `;
    console.log('Tables exist:', tables);

    const enums = await prisma.$queryRaw`
      SELECT enumlabel 
      FROM pg_enum 
      JOIN pg_type ON pg_enum.enumtypid = pg_type.oid 
      WHERE pg_type.typname = 'RideStatus'
    `;
    console.log('RideStatus enums:', enums);

  } catch (error) {
    console.error('Error checking DB:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
