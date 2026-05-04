import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const slug = 'city-star-41m';
  console.log(`🔍 Searching for store with slug: ${slug}`);

  const store = await prisma.store.findUnique({
    where: { slug },
  });

  if (store) {
    console.log('✅ Store found:', store);
  } else {
    console.log('❌ Store not found.');
    
    // Check if there are similar slugs
    const similarStores = await prisma.store.findMany({
      where: {
        slug: {
          contains: 'city-star',
          mode: 'insensitive',
        },
      },
      select: { id: true, name: true, slug: true },
    });
    
    if (similarStores.length > 0) {
      console.log('💡 Similar stores found:', similarStores);
    } else {
      console.log('🤷 No similar stores found.');
    }
  }

  await prisma.$disconnect();
}

main();
