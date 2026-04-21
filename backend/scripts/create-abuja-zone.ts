import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const name = "Abuja";
  const state = "FCT / Nasarawa";
  const coordinates = [
    { lat: 9.20, lng: 7.30 },
    { lat: 9.20, lng: 7.75 },
    { lat: 9.05, lng: 8.05 },
    { lat: 8.75, lng: 8.05 },
    { lat: 8.75, lng: 7.30 },
    { lat: 9.20, lng: 7.30 }
  ];

  console.log(`Creating ServiceZone "${name}" spanning FCT and Nasarawa (Karu, Keffi)...`);

  const zone = await prisma.serviceZone.create({
    data: {
      name,
      state,
      description: "Greater Abuja Metropolitan Area including Karu and Keffi in Nasarawa State.",
      coordinates: coordinates as any,
      isActive: true,
      basePriceMultiplier: 1.0
    }
  });

  console.log("Zone created successfully:", zone);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
