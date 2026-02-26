// 01-users-riders.ts
import { prisma, MAIDUGURI_COORDS, hashPassword } from './seed-utils';
import { UserRole, UserStatus, VerificationStatus } from '@prisma/client';

export async function seedUsersAndRiders() {
  console.log('🌱 Seeding Users and Riders...');
  const PASSWORD_HASH = await hashPassword('Calculus@123');

  // --- 1. Seed Customers ---
  const customers = Array.from({ length: 5 }).map((_, i) => ({
    email: `customer${i + 1}@example.com`,
    name: `Customer ${i + 1}`,
    phone: `+234800000000${i}`,
    role: UserRole.CUSTOMER,
    status: UserStatus.ACTIVE,
    password: PASSWORD_HASH,
  }));

  for (const cust of customers) {
    await prisma.user.upsert({
      where: { email: cust.email },
      update: {},
      create: cust,
    });
  }

  // --- 2. Seed Riders ---
  // Riders need: Active Status, Verified Docs, Service Zone (Coords)
  const riders = Array.from({ length: 5 }).map((_, i) => ({
    email: `rider${i + 1}@example.com`,
    name: `Rider ${i + 1} - Maiduguri`,
    phone: `+234801111111${i}`,
    role: UserRole.RIDER,
    status: UserStatus.ACTIVE,
    isOnline: true,
    countryCode: 'NG',
    password: PASSWORD_HASH,
    currentLat: MAIDUGURI_COORDS.lat + Math.random() * 0.01, // Slight jitter
    currentLng: MAIDUGURI_COORDS.lng + Math.random() * 0.01,
    commissionRate: 20.0, // Platform takes 20%
    walletBalance: 0, // Will be updated in the Wallet Seed
  }));

  for (const riderData of riders) {
    const rider = await prisma.rider.upsert({
      where: { email: riderData.email },
      update: {},
      create: riderData,
    });

    // Seed Verified Rider Documents (Required for Payouts/Active status)
    await prisma.riderDocument.createMany({
      data: [
        {
          riderId: rider.id,
          type: 'DRIVER_LICENSE',
          url: 'https://placehold.co/600x400',
          status: VerificationStatus.VERIFIED,
        },
        {
          riderId: rider.id,
          type: 'VEHICLE_INSURANCE',
          url: 'https://placehold.co/600x400',
          status: VerificationStatus.VERIFIED,
        },
      ],
      skipDuplicates: true, // rudimentary idempotency for sub-records
    });
  }
}
