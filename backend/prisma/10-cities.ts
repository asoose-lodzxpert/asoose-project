import { PrismaClient } from '@prisma/client';

/**
 * City Seed Data
 * Cities are the source of truth for service availability.
 * Admin toggles isActive in the dashboard to enable/disable a city.
 * Zone polygons (ServiceZone) remain for geo detection — they share names with cities.
 */

const CITIES = [
  { name: 'Maiduguri', state: 'Borno', isActive: true },
  { name: 'Abuja', state: 'FCT', isActive: true },
];

export async function seedCities(prisma: PrismaClient) {
  console.log('🏙️  Seeding Cities...');

  for (const city of CITIES) {
    await prisma.city.upsert({
      where: { name: city.name },
      update: { state: city.state, isActive: city.isActive },
      create: { name: city.name, state: city.state, isActive: city.isActive },
    });
    console.log(`  ✅ ${city.name} (${city.state}) — active: ${city.isActive}`);
  }

  const count = await prisma.city.count({ where: { isActive: true } });
  console.log(`🏙️  ${count} active city(ies) configured.\n`);
}
