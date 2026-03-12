/**
 * seed-todays-store.ts
 * ---------------------
 * Seeds all products from Today's Store Maiduguri into the database.
 *
 * Features:
 *  - Creates new categories as needed
 *  - Groups items with the same shortInfo into one product with modifier options
 *  - Description = shortInfo + ". " + longDescription
 *  - Uses S3 image URLs already set in the JSON
 *
 * Run with:
 *   cd backend
 *   npx tsx prisma/seed-todays-store.ts
 */

import { PrismaClient, ProductStatus } from '@prisma/client';
import { readFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const STORE_ID = '20a1cc55-2c1e-4ef8-8a43-c6b18589022a';

// ─── Category Mapping ────────────────────────────────────────────────────────
// Maps each Firebase menuId to a category name.
// Empty string = skip this menu entirely (junk/test data).
const MENU_CATEGORY: Record<string, string> = {
  '1753286799823': 'Electronics', // battery
  '1753286802307': 'Jewelry & Accessories', // Ring
  '1753286801951': 'Fashion', // cloth
  '1753286802949': 'Handbags & Accessories', // Colorful Bags
  '1753287476970': 'Jewelry & Accessories', // Necklace
  '1753286865488': 'Eggs & Poultry', // breeder egg crates
  '1753291318869': '', // test/junk data — skip
  '1753014690661': 'Personal Care', // oral care, toothpaste, antiseptic, sanitary pads
  '1752959222713': 'Baby Care', // baby body care & wipes
  '1752961060450': 'Juice & Smoothies', // juices, milk, energy drinks
  '1753346004729': 'Snacks', // Meximix
  '1753257087092': 'Home Cleaning', // cleaning products
  '1752960532768': 'Bath & Body', // soaps
  '1753347648627': 'Beverages & Malted Drinks', // Ovaltine, Milo, Nescafe, etc.
  '1753347778623': "Men's Fashion", // underwear, t-shirts
  '1753348785382': 'Pet Supplies', // dog food
  '1752958725873': 'Skincare', // body lotions
  '1753354481109': 'Eggs & Poultry', // crate of eggs
  '1753354799372': 'Candy & Sweets', // chewing gum
  '1753356155241': 'Baking', // whipping cream, icing sugar
  '1753356794203': 'Baking', // baking powder
  '1753360735067': 'Dairy', // Blue Band, spreads
  '1753364027922': 'Nuts & Seeds', // cashew nuts
  '1753368907195': 'Hair Care', // hair products, shampoo, conditioner
  '1753369874789': 'Tea & Coffee', // tea varieties
  '1753370895501': 'Baby Formula', // NAN, Nankid formula
  '1753371507716': 'Beverages & Malted Drinks', // cordials, syrups, merlot juice
  '1753015235572': 'Pasta & Noodles', // noodles, macaroni
  '1753433318079': 'Spices', // seasonings
  '1753434169569': 'Snacks', // biscuits, crackers
  '1753436405917': 'Cooking Oil', // sunflower, olive oil
  '1753437696764': 'Baby Care', // diapers
  '1753438690422': 'Condiments & Sauces', // mayonnaise
  '1753439243558': 'Kitchen Appliances', // sandwich makers, air fryers
  '1753441511067': 'Condiments & Sauces', // chili sauce, oyster sauce, soy sauce
  '1753442895313': 'Candy & Sweets', // mints, candy, lozenges
  '1753444338095': 'Condiments & Sauces', // tomato paste
  '1753444856455': 'Fragrances', // body spray, perfume
  '1753449183956': 'Condiments & Sauces', // ketchup
  '1753020951112': 'Toys & Games', // board games, toys
  '1753455089066': 'Home Cleaning', // insecticide
  '1753457880137': 'Cookware & Kitchenware', // pots, food flasks
  '1753521954643': 'Footwear', // men's fancy shoes
  '1753527722022': 'Handbags & Accessories', // Chrisbella bags
  '1753537202733': 'Footwear', // ladies' shoes
};

// ─── New categories to create (existing ones auto-handled by upsert) ─────────
const ALL_CATEGORIES = [
  // New categories for Today's Store
  'Electronics',
  'Jewelry & Accessories',
  'Fashion',
  'Handbags & Accessories',
  'Eggs & Poultry',
  'Baby Care',
  'Home Cleaning',
  'Bath & Body',
  'Beverages & Malted Drinks',
  "Men's Fashion",
  'Pet Supplies',
  'Skincare',
  'Candy & Sweets',
  'Baking',
  'Nuts & Seeds',
  'Hair Care',
  'Tea & Coffee',
  'Baby Formula',
  'Pasta & Noodles',
  'Cooking Oil',
  'Condiments & Sauces',
  'Kitchen Appliances',
  'Fragrances',
  'Toys & Games',
  'Cookware & Kitchenware',
  'Footwear',
  // Existing (will upsert without change)
  'Personal Care',
  'Juice & Smoothies',
  'Snacks',
  'Spices',
  'Dairy',
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function slugify(text: string): string {
  return text
    .toLowerCase()
    .trim()
    .replace(/&/g, 'and')
    .replace(/'/g, '')
    .replace(/\s+/g, '-')
    .replace(/[^\w-]+/g, '')
    .replace(/--+/g, '-')
    .slice(0, 80);
}

function normalizeKey(text: string): string {
  return text.toLowerCase().trim().replace(/\s+/g, ' ');
}

/** Strip garbled non-latin/emoji characters that came from encoding issues */
function cleanText(text: string | undefined | null): string {
  if (!text) return '';
  return text
    .replace(/[^\x20-\x7E\u00C0-\u024F\u0600-\u06FF]/g, '') // keep basic latin, extended latin, arabic
    .replace(/\s+/g, ' ')
    .trim();
}

function buildDescription(shortInfo: string, longDescription: string): string {
  const si = cleanText(shortInfo);
  const ld = cleanText(longDescription);
  if (si && ld && normalizeKey(si) !== normalizeKey(ld)) {
    return `${si}. ${ld}`;
  }
  return si || ld || '';
}

/** Pick the most informative longDescription from a group */
function bestDescription(group: any[]): string {
  return (
    group
      .map((i) => cleanText(i.longDescription || '').trim())
      .filter((ld) => ld.length > 3)
      .sort((a, b) => b.length - a.length)[0] || ''
  );
}

let slugCounter = 0;
function uniqueSlug(name: string): string {
  slugCounter++;
  return `${slugify(name)}-${slugCounter}`;
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🔗 Connecting to database...');
  await prisma.$connect();

  // 1. Verify store exists
  const store = await prisma.store.findUnique({ where: { id: STORE_ID } });
  if (!store) {
    throw new Error(`Store ${STORE_ID} not found. Check STORE_ID.`);
  }
  console.log(`🏪  Store found: "${store.name}"`);

  // 2. Create / fetch all categories
  console.log('\n📁 Upserting categories...');
  const categoryMap: Record<string, string> = {};

  for (const name of ALL_CATEGORIES) {
    const slug = slugify(name);
    const cat = await prisma.category.upsert({
      where: { slug },
      update: {},
      create: { name, slug },
    });
    categoryMap[normalizeKey(name)] = cat.id;
    process.stdout.write('.');
  }
  console.log(`\n✅ ${ALL_CATEGORIES.length} categories ready.\n`);

  // 3. Load items JSON
  const raw = readFileSync(
    join(__dirname, '..', 'raw_data', 'todays-store-maiduguri-items.json'),
    'utf8',
  ).replace(/^\uFEFF/, '');

  const items: any[] = JSON.parse(raw);
  console.log(`📦 Loaded ${items.length} items from JSON.`);

  // 4. Group items by menuId
  const byMenu: Record<string, any[]> = {};
  for (const item of items) {
    if (!byMenu[item.menuId]) byMenu[item.menuId] = [];
    byMenu[item.menuId].push(item);
  }

  let productCount = 0;
  let modifierGroupCount = 0;
  let skippedMenus = 0;

  // 5. Process each menu
  for (const [menuId, menuItems] of Object.entries(byMenu)) {
    const categoryName = MENU_CATEGORY[menuId];

    if (categoryName === '') {
      console.log(`⏭️  Skipping menu ${menuId} (test/junk data)`);
      skippedMenus++;
      continue;
    }

    if (!categoryName) {
      console.log(`⚠️  No category mapping for menu ${menuId} — skipping`);
      skippedMenus++;
      continue;
    }

    const categoryId = categoryMap[normalizeKey(categoryName)];
    if (!categoryId) {
      console.log(`⚠️  Category "${categoryName}" not found in map — skipping`);
      skippedMenus++;
      continue;
    }

    // Sub-group items by normalised shortInfo (same shortInfo = same product, different variants)
    const byShortInfo: Record<string, any[]> = {};
    for (const item of menuItems) {
      const key = normalizeKey(
        cleanText(item.shortInfo) || cleanText(item.title) || 'unknown',
      );
      if (!byShortInfo[key]) byShortInfo[key] = [];
      byShortInfo[key].push(item);
    }

    for (const [, group] of Object.entries(byShortInfo)) {
      const basePrice = Math.min(...group.map((i) => i.price));
      const representative = group[0];

      // Product name: use shortInfo, fall back to title
      const productName =
        cleanText(representative.shortInfo).trim() ||
        cleanText(representative.title).trim() ||
        'Product';

      // Description: shortInfo + best longDescription
      const longDesc = bestDescription(group);
      const description =
        buildDescription(cleanText(representative.shortInfo), longDesc) || null;

      // Images: unique S3 URLs across the group
      const images = [
        ...new Set(group.map((i) => i.thumbnailUrl).filter(Boolean)),
      ] as string[];

      const slug = uniqueSlug(productName);

      // Create product
      const product = await prisma.product.create({
        data: {
          name: productName,
          slug,
          description,
          price: basePrice,
          images,
          storeId: STORE_ID,
          categoryId,
          status: ProductStatus.ACTIVE,
          stock: 999,
        },
      });

      productCount++;

      // Add modifier group if there are multiple variants
      if (group.length > 1) {
        // Decide modifier names: if all titles are identical, use longDescription as label
        const allTitlesIdentical = group.every(
          (i) =>
            normalizeKey(cleanText(i.title)) ===
            normalizeKey(cleanText(group[0].title)),
        );

        const getModifierName = (item: any, index: number): string => {
          if (allTitlesIdentical) {
            const ld = cleanText(item.longDescription || '').trim();
            return ld || `Option ${index + 1}`;
          }
          return cleanText(item.title).trim() || `Option ${index + 1}`;
        };

        await prisma.modifierGroup.create({
          data: {
            productId: product.id,
            name: 'Select Your Option',
            minSelect: 1,
            maxSelect: 1,
            modifiers: {
              create: group.map((item, idx) => ({
                name: getModifierName(item, idx),
                price: Math.max(0, item.price - basePrice),
              })),
            },
          },
        });

        modifierGroupCount++;
      }

      process.stdout.write(
        `\r✅ Products: ${productCount}  (${modifierGroupCount} with options)`,
      );
    }
  }

  console.log(`\n\n🎉 Done!`);
  console.log(`   Products created  : ${productCount}`);
  console.log(`   With modifier groups: ${modifierGroupCount}`);
  console.log(`   Menus skipped     : ${skippedMenus}`);
}

main()
  .catch((e) => {
    console.error('\n❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
