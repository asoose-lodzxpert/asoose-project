import { PrismaClient } from '@prisma/client';
import { nigerianBanks } from './banks-seed';

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
      update: {},
      create: setting,
    });
  }

  console.log('🏦 Seeding Nigerian banks...');

  for (const bank of nigerianBanks) {
    await prisma.bank.upsert({
      where: { code: bank.code },
      update: { name: bank.name, isActive: true },
      create: { name: bank.name, code: bank.code, isActive: true },
    });
  }

  console.log('🍕 Seeding product categories...');

  const categories = [
    { name: 'Meals', slug: 'meals' },
    { name: 'Drinks', slug: 'drinks' },
    { name: 'Snacks', slug: 'snacks' },
    { name: 'Desserts', slug: 'desserts' },
    { name: 'Breakfast', slug: 'breakfast' },
    { name: 'Lunch', slug: 'lunch' },
    { name: 'Dinner', slug: 'dinner' },
    { name: 'Groceries', slug: 'groceries' },
    { name: 'Fruits', slug: 'fruits' },
    { name: 'Vegetables', slug: 'vegetables' },
    { name: 'Bakery', slug: 'bakery' },
    { name: 'Dairy', slug: 'dairy' },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: { name: category.name },
      create: category,
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
