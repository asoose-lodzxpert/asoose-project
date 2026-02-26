// seed-utils.ts
// Shared constants and helpers
import { PrismaClient } from '@prisma/client';
import * as argon2 from 'argon2';

export const prisma = new PrismaClient();
export const MAIDUGURI_COORDS = { lat: 11.8311, lng: 13.151 };

export const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536, // 64 MB in KiB
  timeCost: 3, // number of iterations
  parallelism: 4, // degree of parallelism
  raw: false, // return encoded string, not raw Buffer
};

/** Hash a plain-text password using argon2id */
export async function hashPassword(plain: string): Promise<string> {
  return argon2.hash(plain, ARGON2_OPTIONS);
}

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
