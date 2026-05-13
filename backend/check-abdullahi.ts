// @ts-nocheck
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const rider = await prisma.rider.findFirst({
    where: {
      name: {
        contains: 'Abdullahi Haruna Muhammad',
        mode: 'insensitive'
      }
    },
    include: {
      rides: {
        orderBy: { createdAt: 'desc' },
        take: 10
      },
      deliveries: {
        orderBy: { createdAt: 'desc' },
        take: 10
      }
    }
  });

  if (!rider) {
    console.log("No rider found.");
    return;
  }

  console.log(`Driver: ${rider.name} (ID: ${rider.id})`);
  console.log(`Email: ${rider.email}`);
  console.log(`Phone: ${rider.phone}`);
  console.log(`Status: ${rider.status}`);
  console.log(`Wallet Balance (Accumulated Earnings?): ₦${rider.walletBalance}`);
  console.log(`Total Rides field: ${rider.totalRides}`);

  console.log(`\n--- Last 10 Rides ---`);
  if (rider.rides?.length) {
    for (const ride of rider.rides) {
      console.log(` Ride: ${ride.id} | Status: ${ride.status} | Fare: ₦${ride.fare || 0} | Date: ${ride.createdAt}`);
    }
  } else {
    console.log(` No rides found.`);
  }

  console.log(`\n--- Last 10 Deliveries ---`);
  if (rider.deliveries?.length) {
    for (const del of rider.deliveries) {
      console.log(` Delivery: ${del.id} | Status: ${del.status} | Fee: ₦${del.deliveryFee || 0} | Date: ${del.createdAt}`);
    }
  } else {
    console.log(` No deliveries found.`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
