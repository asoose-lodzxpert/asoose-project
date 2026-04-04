import 'dotenv/config';
import { PrismaClient, UserStatus, UserRole, VerificationStatus, WalletEntityType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536, // 64 MB in KiB
  timeCost: 3,
  parallelism: 4,
  raw: false,
};

async function main() {
  const email = 'rider-tester@asoose.com';
  const password = 'AsooseRider2026!';
  
  console.log(`\n🚀 Seeding tester rider account: ${email}\n`);

  // 1. Hash password (Argon2id)
  const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

  // 2. Clear existing if any
  const existingRider = await prisma.rider.findUnique({ where: { email } });
  if (existingRider) {
    console.log(`♻️ Found existing tester rider. Deleting all related data for fresh state...`);
    
    // Clear relations that depend on Rider
    await prisma.notification.deleteMany({ where: { riderId: existingRider.id } });
    await prisma.transaction.deleteMany({ 
        where: { 
            OR: [
                { entityId: existingRider.id, entityType: WalletEntityType.RIDER },
                { riderPayout: { riderId: existingRider.id } }
            ]
        } 
    });
    await prisma.riderPayout.deleteMany({ where: { riderId: existingRider.id } });
    await prisma.ride.deleteMany({ where: { riderId: existingRider.id } });
    await prisma.riderDocument.deleteMany({ where: { riderId: existingRider.id } });
    await prisma.riderNotificationSettings.deleteMany({ where: { riderId: existingRider.id } });
    
    // Finally delete the rider
    await prisma.rider.delete({ where: { id: existingRider.id } });
  }

  // 3. Create Rider
  const rider = await prisma.rider.create({
    data: {
      email,
      name: 'Rider Tester',
      password: hashedPassword,
      phone: '+2348036930773',
      role: UserRole.DRIVER,
      status: UserStatus.ACTIVE,
      isOnline: true,
      countryCode: 'NG',
      currentLat: 11.8333, // Maiduguri
      currentLng: 13.1500,
      commissionRate: 20.0,
      walletBalance: 2500.0, // Start with some earnings
    }
  });

  console.log(`✅ Rider created: ${rider.email}`);

  // 4. Seed Verified Rider Documents
  await prisma.riderDocument.createMany({
    data: [
      {
        riderId: rider.id,
        type: 'DRIVER_LICENSE',
        url: 'https://placehold.co/600x400?text=Driver+License',
        status: VerificationStatus.VERIFIED,
      },
      {
        riderId: rider.id,
        type: 'VEHICLE_INSURANCE',
        url: 'https://placehold.co/600x400?text=Insurance',
        status: VerificationStatus.VERIFIED,
      },
    ],
  });

  console.log(`✅ Documents verified for rider.`);
  console.log(`\n🎉 Seeding complete! The account is ready for review.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
