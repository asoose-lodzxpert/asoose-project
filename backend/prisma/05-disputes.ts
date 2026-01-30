// 05-disputes.ts
import { prisma } from './seed-utils';
import { 
  DisputeStatus, DisputePriority, OrderStatus, 
  RideStatus, UserRole 
} from '@prisma/client';

export async function seedDisputes() {
  console.log('🌱 Seeding Disputes and Resolution flows...');

  // 1. Fetch Actors
  const customer = await prisma.user.findFirst({ where: { role: UserRole.CUSTOMER } });
  const rider = await prisma.rider.findFirst();
  const store = await prisma.store.findFirst();

  if (!customer || !rider || !store) {
    throw new Error("❌ Run Users and Vendors seeds first.");
  }

  // --- Scenario A: "Order Missing Item" (OPEN Dispute) ---
  // 1. Create a problematic order
  const problemOrder = await prisma.order.create({
    data: {
      userId: customer.id,
      storeId: store.id,
      total: 3500.00,
      status: OrderStatus.DELIVERED,
      paymentStatus: 'PAID',
      items: {
        create: { nameSnap: "Jollof Rice Combo", quantity: 1, price: 3500.00 }
      }
    }
  });

  // 2. Create the Dispute
  const disputeA = await prisma.dispute.create({
    data: {
      status: DisputeStatus.OPEN,
      priority: DisputePriority.HIGH,
      reason: "Missing Item",
      description: "I ordered the combo but the drink was missing.",
      openedByUserId: customer.id,
      orderId: problemOrder.id,
      evidenceImages: ["https://placehold.co/400x400/png?text=Evidence+A"],
      createdAt: new Date()
    }
  });

  // 3. Add Chat Messages
  await prisma.disputeMessage.createMany({
    data: [
      {
        disputeId: disputeA.id,
        senderId: customer.id,
        message: "Hi, I received my food but the drink is missing.",
        isInternal: false
      },
      {
        disputeId: disputeA.id,
        // Using customer.id as sender for Admin simulation since we don't have an ADMIN user seeded yet
        senderId: customer.id, 
        message: "We are looking into this with the vendor.",
        isInternal: true 
      }
    ]
  });

  // --- Scenario B: "Rude Driver" (RESOLVED Dispute with Refund) ---
  // 1. Create the Ride
  const problemRide = await prisma.ride.create({
    data: {
      customerId: customer.id,
      riderId: rider.id,
      // Ensure these addresses exist or create generic ones if necessary
      pickupAddressId: (await prisma.address.findFirst())?.id || '', 
      dropoffAddressId: (await prisma.address.findFirst())?.id || '',
      status: RideStatus.COMPLETED,
      totalFare: 2000.00,
    }
  });

  // 2. Create Resolved Dispute
  await prisma.dispute.create({
    data: {
      status: DisputeStatus.RESOLVED,
      priority: DisputePriority.MEDIUM,
      reason: "Driver Rude/Unsafe",
      description: "Driver was speeding and shouting.",
      openedByUserId: customer.id,
      
      // FIX: Removed targetUserId: rider.id 
      // linking the rideId is sufficient to identify the rider involved
      rideId: problemRide.id, 
      
      adminNotes: "Investigated. Driver warned. Partial refund issued.",
      resolution: "Refund Issued",
      refundAmount: 500.00,
      resolvedAt: new Date(),
    }
  });
}