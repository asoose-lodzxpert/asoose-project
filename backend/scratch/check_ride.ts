
import { PrismaClient, RideStatus } from '@prisma/client';

async function main() {
  const prisma = new PrismaClient();
  const rideId = 'cf710e0e';

  // Search for the ride. The ID might be a prefix or a full UUID.
  // The user provided 'cf710e0e', which looks like a prefix or a short ID.
  const rides = await prisma.ride.findMany({
    where: {
      id: {
        startsWith: rideId
      }
    },
    include: {
      pickupAddress: true,
      dropoffAddress: true,
      rider: true,
      customer: true
    }
  });

  if (rides.length === 0) {
    console.log(`No ride found starting with ID ${rideId}`);
    return;
  }

  if (rides.length > 1) {
    console.log(`Multiple rides found starting with ID ${rideId}:`);
    rides.forEach(r => console.log(`- ${r.id} (${r.status})`));
    return;
  }

  const ride = rides[0];
  console.log('Ride found:');
  console.log(JSON.stringify(ride, null, 2));
}

main().catch(console.error);
