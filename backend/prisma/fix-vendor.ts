import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug = 'city-star-41m';
  const lat = 11.8310981;
  const lng = 13.1509672;

  console.log(`🚀 Updating coordinates for store: ${slug}`);

  const store = await prisma.store.update({
    where: { slug },
    data: {
      lat,
      lng,
      // Also ensure opening hours are set for availability check
      openingHours: {
        upsert: [
          { where: { storeId_dayOfWeek: { storeId: 'bde7237f-a90b-43f8-b1ee-44de10f24993', dayOfWeek: 0 } }, create: { dayOfWeek: 0, openTime: '08:00', closeTime: '22:00' }, update: {} },
          { where: { storeId_dayOfWeek: { storeId: 'bde7237f-a90b-43f8-b1ee-44de10f24993', dayOfWeek: 1 } }, create: { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' }, update: {} },
          { where: { storeId_dayOfWeek: { storeId: 'bde7237f-a90b-43f8-b1ee-44de10f24993', dayOfWeek: 2 } }, create: { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' }, update: {} },
          { where: { storeId_dayOfWeek: { storeId: 'bde7237f-a90b-43f8-b1ee-44de10f24993', dayOfWeek: 3 } }, create: { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' }, update: {} },
          { where: { storeId_dayOfWeek: { storeId: 'bde7237f-a90b-43f8-b1ee-44de10f24993', dayOfWeek: 4 } }, create: { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' }, update: {} },
          { where: { storeId_dayOfWeek: { storeId: 'bde7237f-a90b-43f8-b1ee-44de10f24993', dayOfWeek: 5 } }, create: { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00' }, update: {} },
          { where: { storeId_dayOfWeek: { storeId: 'bde7237f-a90b-43f8-b1ee-44de10f24993', dayOfWeek: 6 } }, create: { dayOfWeek: 6, openTime: '08:00', closeTime: '22:00' }, update: {} },
        ]
      }
    },
  });

  console.log('✅ Store updated:', store);

  await prisma.$disconnect();
}

main();
