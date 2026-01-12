import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');

  const settings = [
    { key: 'maintenance_mode', value: 'false', category: 'General' },
    { key: 'support_phone', value: '+234 800 000 0000', category: 'General' },
    { key: 'global_commission', value: '10', category: 'Financials' },
    { key: 'min_withdrawal', value: '5000', category: 'Financials' },
    { key: 'base_fare_bike', value: '500', category: 'Logistics' },
    { key: 'cost_per_km', value: '100', category: 'Logistics' },
    { key: 'search_radius', value: '10', category: 'Logistics' },
  ];

  console.log('📦 Seeding system settings...');
  
  for (const setting of settings) {
    await prisma.systemSetting.upsert({
      where: { key: setting.key },
      update: {}, // Don't overwrite existing values if they already exist
      create: setting,
    });
  }

  console.log('✅ Seeding completed successfully.');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });