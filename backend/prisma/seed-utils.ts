// seed-utils.ts
// Shared constants and helpers
import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient();
export const MAIDUGURI_COORDS = { lat: 11.8311, lng: 13.151 };
export const PASSWORD_HASH =
  '$2b$10$EpRnTzVlqHNP0.fKbX9neeCFr.nwcV7sO/tCq.pE/JH.Z8k/M.mC'; // "password123"

export async function cleanDatabase() {
  // Wipe all major tables in dependency order
  await prisma.disputeMessage.deleteMany();
  await prisma.dispute.deleteMany();
  await prisma.ride.deleteMany();
  await prisma.delivery.deleteMany();
  await prisma.transaction.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.product.deleteMany();
  await prisma.vendorPayout.deleteMany();
  await prisma.store.deleteMany();
  await prisma.vendor.deleteMany();
  await prisma.riderDocument.deleteMany();
  await prisma.rider.deleteMany();
  await prisma.user.deleteMany();
  await prisma.address.deleteMany();
  await prisma.bank.deleteMany();
  await prisma.category.deleteMany();
  // Add more tables as needed for full wipe
}
