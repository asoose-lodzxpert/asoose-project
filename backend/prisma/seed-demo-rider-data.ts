import { PrismaClient, RideStatus, UserRole, TransactionType, TransactionStatus, WalletEntityType, PayoutStatus, Address } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const riderEmail = 'rider-tester@asoose.com';
  
  console.log(`\n📦 Seeding demo data for rider: ${riderEmail}\n`);

  const rider = await prisma.rider.findUnique({
    where: { email: riderEmail },
  });

  if (!rider) {
    console.error('❌ Rider not found. Please run the rider seed script first.');
    return;
  }

  // 1. Clear existing demo data
  console.log('🚮 Clearing existing demo data...');
  await prisma.notification.deleteMany({ where: { riderId: rider.id } });
  await prisma.transaction.deleteMany({ 
      where: { 
          entityType: WalletEntityType.RIDER,
          entityId: rider.id 
      } 
  });
  await prisma.ride.deleteMany({ where: { riderId: rider.id } });

  // 2. Create/Find demo customers and addresses
  const customers = await prisma.user.findMany({
      where: { role: UserRole.CUSTOMER },
      take: 3
  });
  
  if (customers.length < 1) {
      console.error('❌ No customers found to link rides to.');
      return;
  }

  const addresses = [
      { label: 'Maiduguri Airport', street: 'Airport Rd', city: 'Maiduguri', state: 'Borno', lat: 11.8541, lng: 13.0805 },
      { label: 'University of Maiduguri', street: 'Bama Rd', city: 'Maiduguri', state: 'Borno', lat: 11.8081, lng: 13.1971 },
      { label: 'Shehu of Borno Palace', street: 'Palace Way', city: 'Maiduguri', state: 'Borno', lat: 11.8384, lng: 13.1534 },
      { label: 'Borno State Specialist Hospital', street: 'Hospital Rd', city: 'Maiduguri', state: 'Borno', lat: 11.8311, lng: 13.1418 }
  ];

  const seededAddresses: Address[] = [];
  for (const addr of addresses) {
      const a = await prisma.address.create({
          data: { ...addr }
      });
      seededAddresses.push(a);
  }

  // 3. Seed Rides
  console.log('🚗 Seeding rides...');
  const ridesData = [
    { 
        status: RideStatus.COMPLETED, 
        minutesAgo: 10, 
        customer: customers[0], 
        pickup: seededAddresses[0], 
        dropoff: seededAddresses[1],
        fare: 4500,
        dist: 12.5
    },
    { 
        status: RideStatus.COMPLETED, 
        minutesAgo: 120, 
        customer: customers[1], 
        pickup: seededAddresses[2], 
        dropoff: seededAddresses[3],
        fare: 2200, 
        dist: 4.8
    },
    { 
        status: RideStatus.CANCELLED_BY_USER, 
        minutesAgo: 240, 
        customer: customers[2], 
        pickup: seededAddresses[1], 
        dropoff: seededAddresses[2],
        fare: 0,
        dist: 5.2
    },
    { 
        status: RideStatus.DRIVER_ACCEPTED, 
        minutesAgo: 2, 
        customer: customers[0], 
        pickup: seededAddresses[3], 
        dropoff: seededAddresses[0],
        fare: 3800,
        dist: 10.1
    }
  ];

  let currentBalance = rider.walletBalance;

  for (const data of ridesData) {
    const createdAt = new Date(Date.now() - data.minutesAgo * 60000);
    const ride = await prisma.ride.create({
      data: {
        customerId: data.customer.id,
        riderId: rider.id,
        pickupAddressId: data.pickup.id,
        dropoffAddressId: data.dropoff.id,
        status: data.status,
        totalFare: data.fare,
        distanceKm: data.dist,
        durationMin: Math.round(data.dist * 2), // rough estimate
        createdAt: createdAt,
        updatedAt: createdAt,
        acceptedAt: createdAt,
        completedAt: data.status === RideStatus.COMPLETED ? new Date(createdAt.getTime() + 20 * 60000) : null
      }
    });

    // 4. Create Transactions for completed rides
    if (data.status === RideStatus.COMPLETED) {
        const platformFee = (data.fare || 0) * (rider.commissionRate / 100);
        const riderEarning = (data.fare || 0) - platformFee;
        
        const balanceBefore = currentBalance;
        currentBalance += riderEarning;

        await prisma.transaction.create({
            data: {
                entityType: WalletEntityType.RIDER,
                entityId: rider.id,
                rideId: ride.id,
                amount: riderEarning,
                type: TransactionType.RIDER_EARNING,
                status: TransactionStatus.COMPLETED,
                description: `Earning from ride #${ride.id.slice(0, 8)}`,
                balanceBefore: balanceBefore,
                balanceAfter: currentBalance,
                createdAt: new Date(createdAt.getTime() + 21 * 60000) // Slightly after completion
            }
        });

        // Update rider balance in DB
        await prisma.rider.update({
            where: { id: rider.id },
            data: { walletBalance: currentBalance, totalRides: { increment: 1 } }
        });
    }

    // 5. Create Notifications
    if (data.status === RideStatus.DRIVER_ACCEPTED) {
        await prisma.notification.create({
            data: {
                riderId: rider.id,
                title: 'New Ride Assigned!',
                message: `You have an active ride request from ${data.customer.name}. Head to ${data.pickup.label}.`,
                type: 'ORDER',
                category: 'ORDER_ASSIGNED',
                isRead: false,
                metadata: { rideId: ride.id },
                createdAt: createdAt
            }
        });
    }
  }

  // 6. Seed Payout History
  console.log('💰 Seeding payout history...');
  const payouts = [
      { amount: 5000, minutesAgo: 2880 }, // 2 days ago
      { amount: 12000, minutesAgo: 10080 }, // 1 week ago
  ];

  for (const p of payouts) {
      const pAt = new Date(Date.now() - p.minutesAgo * 60000);
      const payout = await prisma.riderPayout.create({
          data: {
              riderId: rider.id,
              amount: p.amount,
              status: PayoutStatus.COMPLETED,
              processedAt: pAt,
              createdAt: pAt,
              reference: `PYT-${Math.floor(Math.random() * 1000000)}`
          }
      });

      await prisma.transaction.create({
          data: {
              entityType: WalletEntityType.RIDER,
              entityId: rider.id,
              riderPayoutId: payout.id,
              amount: p.amount,
              type: TransactionType.PAYOUT_COMPLETED,
              status: TransactionStatus.COMPLETED,
              description: `Payout to bank account (#${payout.reference})`,
              balanceBefore: currentBalance + p.amount, // simulate past higher balance
              balanceAfter: currentBalance,
              createdAt: pAt
          }
      });
  }

  // 7. General Notifications
  console.log('🔔 Seeding general notifications...');
  const misc = [
      { title: 'Payment Confirmed', message: 'Payment for your recent ride has been successfully processed.', type: 'PAYMENT', category: 'PAYMENT_RECEIVED', minutesAgo: 30 },
      { title: 'New Rating Received', message: 'You received a 5-star rating! Keep up the great work.', type: 'SYSTEM', category: 'NEW_REVIEW', minutesAgo: 15 },
      { title: 'ID Document Verified', message: 'Your driver license has been verified. You can now accept all ride types.', type: 'SYSTEM', category: 'VERIFICATION_SUCCESS', minutesAgo: 1440 }
  ];

  for (const m of misc) {
      await prisma.notification.create({
          data: {
              riderId: rider.id,
              title: m.title,
              message: m.message,
              type: m.type,
              category: m.category,
              isRead: m.minutesAgo > 60,
              createdAt: new Date(Date.now() - m.minutesAgo * 60000)
          }
      });
  }

  console.log(`\n✅ Seeding complete! Rider Wallet Balance: ₦${currentBalance.toLocaleString()}\n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
