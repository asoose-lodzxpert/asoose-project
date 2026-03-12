/**
 * fix-image-urls.ts
 * Replaces region-less S3 URLs with correct region-aware URLs in the DB,
 * and updates the JSON file as well.
 */
import { PrismaClient } from '@prisma/client';
import { readFileSync, writeFileSync } from 'fs';
import { join } from 'path';

const prisma = new PrismaClient();

const STORE_ID = '20a1cc55-2c1e-4ef8-8a43-c6b18589022a';
const OLD_PREFIX = 'https://asoose-storage-migration.s3.amazonaws.com/';
const NEW_PREFIX =
  'https://asoose-storage-migration.s3.us-east-1.amazonaws.com/';

async function main() {
  console.log('Connecting to DB...');

  // ── Fix DB product images ──────────────────────────────────────────────
  const products = await prisma.product.findMany({
    where: { storeId: STORE_ID },
    select: { id: true, images: true },
  });

  console.log(`Found ${products.length} products in store.`);

  // Single bulk SQL UPDATE — replace old URL prefix in every element of the images array
  const result = await prisma.$executeRaw`
    UPDATE "Product"
    SET images = ARRAY(
      SELECT replace(
        elem,
        ${OLD_PREFIX},
        ${NEW_PREFIX}
      )
      FROM unnest(images) AS elem
    )
    WHERE "storeId" = ${STORE_ID}
      AND images::text LIKE ${'%' + OLD_PREFIX + '%'}
  `;
  console.log(`DB rows updated: ${result}`);

  // ── Fix JSON file thumbnailUrls ────────────────────────────────────────
  const jsonPath = join(
    __dirname,
    '..',
    'raw_data',
    'todays-store-maiduguri-items.json',
  );
  const raw = readFileSync(jsonPath, 'utf8').replace(/^\uFEFF/, '');
  const items = JSON.parse(raw);

  let jsonFixed = 0;
  for (const item of items) {
    if (item.thumbnailUrl && item.thumbnailUrl.startsWith(OLD_PREFIX)) {
      item.thumbnailUrl =
        NEW_PREFIX + item.thumbnailUrl.slice(OLD_PREFIX.length);
      jsonFixed++;
    }
  }

  writeFileSync(jsonPath, JSON.stringify(items, null, 2), 'utf8');
  console.log(`JSON updated: ${jsonFixed} / ${items.length} items.`);
}

main()
  .catch((e) => {
    console.error('Error:', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
