// 01-address.ts
import { prisma } from './seed-utils';

export async function seedAddresses() {
  console.log('🌱 Seeding Addresses...');

  // Create a generic address for use in other seeds
  const address = await prisma.address.upsert({
    where: { id: 'seed-address-1' },
    update: {},
    create: {
      id: 'seed-address-1',
      label: 'Seed Pickup',
      street: '123 Main St',
      city: 'Maiduguri',
      state: 'Borno',
      lat: 11.8311,
      lng: 13.151,
      isDefault: true,
    },
  });

  // Optionally create a second address for dropoff
  const address2 = await prisma.address.upsert({
    where: { id: 'seed-address-2' },
    update: {},
    create: {
      id: 'seed-address-2',
      label: 'Seed Dropoff',
      street: '456 Market Rd',
      city: 'Maiduguri',
      state: 'Borno',
      lat: 11.8322,
      lng: 13.1522,
      isDefault: false,
    },
  });

  return { pickupAddress: address, dropoffAddress: address2 };
}
