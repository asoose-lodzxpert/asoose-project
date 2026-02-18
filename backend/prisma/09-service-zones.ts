import { PrismaClient } from '@prisma/client';

/**
 * Service Zone Seed Data
 *
 * Each zone is an array of { lat, lng } vertices forming a closed polygon.
 * The polygon does NOT need the first point repeated at the end —
 * the ray-casting algorithm auto-closes it.
 *
 * To add a new city: define its bounding polygon and add it to ZONES below.
 */

const ZONES = [
  {
    name: 'Maiduguri',
    description: 'Maiduguri city and surrounding area in Borno State',
    coordinates: [
      { lat: 11.70, lng: 13.00 },  // SW corner
      { lat: 11.70, lng: 13.30 },  // SE corner
      { lat: 11.95, lng: 13.30 },  // NE corner
      { lat: 11.95, lng: 13.00 },  // NW corner
    ],
    isActive: true,
    basePriceMultiplier: 1.0,
  },
];

export async function seedServiceZones(prisma: PrismaClient) {
  console.log('🗺️  Seeding Service Zones...');

  for (const zone of ZONES) {
    await prisma.serviceZone.upsert({
      where: {
        // Use a composite lookup by name since there's no unique constraint
        // Fallback: find first, then create or update
        id: (
          await prisma.serviceZone.findFirst({ where: { name: zone.name } })
        )?.id ?? 'new-zone-placeholder',
      },
      update: {
        description: zone.description,
        coordinates: zone.coordinates,
        isActive: zone.isActive,
        basePriceMultiplier: zone.basePriceMultiplier,
      },
      create: {
        name: zone.name,
        description: zone.description,
        coordinates: zone.coordinates,
        isActive: zone.isActive,
        basePriceMultiplier: zone.basePriceMultiplier,
      },
    });
    console.log(`  ✅ ${zone.name} (${zone.coordinates.length} vertices, active: ${zone.isActive})`);
  }

  const count = await prisma.serviceZone.count({ where: { isActive: true } });
  console.log(`🗺️  ${count} active service zone(s) configured.\n`);
}
