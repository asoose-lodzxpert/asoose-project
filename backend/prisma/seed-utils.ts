// seed-utils.ts
// Shared constants and helpers
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt'; // Ensure you have installed bcrypt or use a dummy hash

export const prisma = new PrismaClient();
export const MAIDUGURI_COORDS = { lat: 11.8311, lng: 13.1510 };
export const PASSWORD_HASH = '$2b$10$EpRnTzVlqHNP0.fKbX9neeCFr.nwcV7sO/tCq.pE/JH.Z8k/M.mC'; // "password123"

export async function cleanDatabase() {
  // Optional: Use if you want a hard reset
  // await prisma.transaction.deleteMany();
  // await prisma.order.deleteMany();
  // await prisma.user.deleteMany();
}