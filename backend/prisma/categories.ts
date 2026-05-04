// 01-categories.ts
import { prisma } from './seed-utils';

function slugify(text: string) {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '');
}

export async function seedCategories() {
  console.log('🌱 Seeding Categories...');
  await prisma.$connect();

  const categories = [
    // Food
    'Rice Bowls',
    'Swallows',
    'Soups',
    'Grills',
    'Fast Food',
    'Breakfast',
    'HEBRON BUKKA BREAKFAST PROMO',
    'Local Dishes',

    // Drinks
    'Drinks',
    'Soft Drinks',
    'Juice & Smoothies',
    'Energy Drinks',
    'Water',

    // Grocery
    'Groceries',
    'Vegetables',
    'Fruits',
    'Frozen Foods',
    'Snacks',
    'Dairy',
    'Bakery',

    // Pharmacy
    'Pharmacy',
    'Prescription Drugs',
    'OTC Medicine',
    'Supplements',
    'Personal Care',

    // Market
    'Meat & Poultry',
    'Seafood',
    'Grains & Tubers',
    'Spices',
  ];

  for (const name of categories) {
    await prisma.category.upsert({
      where: { slug: slugify(name) },
      update: {},
      create: {
        name,
        slug: slugify(name),
      },
    });
  }

  console.log('✅ Categories Seeded');
}
