/**
 * modifier-product-seed.ts
 * ------------------------
 * Seeds a rich food product (Signature Grilled Chicken) with 5 modifier groups
 * and 25+ modifier options into the first active RESTAURANT store found in the DB.
 *
 * Run with:
 *   cd backend
 *   npx tsx prisma/modifier-product-seed.ts
 */

import { PrismaClient, ProductStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // ── 1. Find a target store ────────────────────────────────────────────────
  const store = await prisma.store.findFirst({
    where: { type: 'RESTAURANT', status: 'ACTIVE' },
    select: { id: true, name: true },
  });

  if (!store) {
    throw new Error(
      'No active RESTAURANT store found. Run the vendor seed first.',
    );
  }

  console.log(`🏪  Using store: "${store.name}" (${store.id})`);

  // ── 2. Find (or pick the first) food category ────────────────────────────
  const category = await prisma.category.findFirst({
    where: {
      OR: [
        { slug: { contains: 'rice' } },
        { slug: { contains: 'food' } },
        { slug: { contains: 'chicken' } },
        { slug: { contains: 'grill' } },
        { slug: { contains: 'burger' } },
        { slug: { contains: 'meal' } },
      ],
    },
  });

  const fallbackCategory = category ?? (await prisma.category.findFirst());

  if (!fallbackCategory) {
    throw new Error('No category found. Run the category seed first.');
  }

  console.log(
    `🗂️  Using category: "${fallbackCategory.name}" (${fallbackCategory.id})`,
  );

  // ── 3. Create the product ─────────────────────────────────────────────────
  const slug = `signature-grilled-chicken-${Date.now()}`;

  const product = await prisma.product.create({
    data: {
      name: 'Signature Grilled Chicken',
      slug,
      description:
        'Smoky, tender grilled chicken served with your choice of size, protein add-ons, side dishes, sauces, and drinks. Customise every bite.',
      price: 3500,
      storeId: store.id,
      categoryId: fallbackCategory.id,
      status: ProductStatus.ACTIVE,
      stock: 100,
    },
  });

  console.log(`🍗  Created product: "${product.name}" (${product.id})`);

  // ── 4. Modifier groups ────────────────────────────────────────────────────
  const groups = [
    {
      name: 'Choose Your Size',
      minSelect: 1,
      maxSelect: 1, // radio — exactly one required
      modifiers: [
        { name: 'Quarter Chicken', price: 0 },
        { name: 'Half Chicken', price: 800 },
        { name: 'Full Chicken', price: 1800 },
        { name: 'Family Pack (×2)', price: 3200 },
      ],
    },
    {
      name: 'Protein Add-ons',
      minSelect: 0,
      maxSelect: 3, // pick up to 3 extras
      modifiers: [
        { name: 'Extra Gizzard', price: 300 },
        { name: 'Extra Chicken Wings', price: 500 },
        { name: 'Suya-Spiced Beef', price: 600 },
        { name: 'Shrimp Skewer', price: 800 },
        { name: 'Turkey Leg', price: 950 },
      ],
    },
    {
      name: 'Side Dish',
      minSelect: 1,
      maxSelect: 2, // choose 1–2 sides
      modifiers: [
        { name: 'Jollof Rice', price: 0 },
        { name: 'Fried Plantain', price: 200 },
        { name: 'Coleslaw', price: 150 },
        { name: 'Pounded Yam', price: 350 },
        { name: 'Spaghetti Jollof', price: 300 },
        { name: 'Garden Salad', price: 250 },
        { name: 'Ofada Rice', price: 400 },
      ],
    },
    {
      name: 'Sauce & Spice Level',
      minSelect: 1,
      maxSelect: 1, // exactly one sauce
      modifiers: [
        { name: 'Pepper Sauce (Mild)', price: 0 },
        { name: 'Pepper Sauce (Hot)', price: 0 },
        { name: 'Suya Spice Rub', price: 0 },
        { name: 'BBQ Glaze', price: 150 },
        { name: 'Garlic Butter Drizzle', price: 150 },
        { name: 'Ofada Stew', price: 200 },
      ],
    },
    {
      name: 'Drinks',
      minSelect: 0,
      maxSelect: 2, // optional, pick up to 2
      modifiers: [
        { name: 'Bottled Water (50cl)', price: 200 },
        { name: 'Soft Drink – Coke 35cl', price: 300 },
        { name: 'Soft Drink – Fanta 35cl', price: 300 },
        { name: 'Chivita Juice 35cl', price: 350 },
        { name: 'Zobo Drink 50cl', price: 300 },
        { name: 'Chapman 50cl', price: 500 },
      ],
    },
  ];

  for (const group of groups) {
    const created = await prisma.modifierGroup.create({
      data: {
        productId: product.id,
        name: group.name,
        minSelect: group.minSelect,
        maxSelect: group.maxSelect,
        modifiers: {
          create: group.modifiers,
        },
      },
      include: { modifiers: true },
    });

    console.log(
      `  ✅ Group "${created.name}" — ${created.modifiers.length} modifiers ` +
        `(min ${group.minSelect}, max ${group.maxSelect})`,
    );
  }

  const totalModifiers = groups.reduce((s, g) => s + g.modifiers.length, 0);
  console.log(
    `\n✨ Done — product seeded with ${groups.length} modifier groups and ${totalModifiers} modifier options.`,
  );
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
