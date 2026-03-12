/**
 * migrate-image-urls.ts
 * Replaces all old S3 image URLs with new S3 URLs across every relevant table/column.
 *
 * Old: https://asoose-storage.s3.eu-north-1.amazonaws.com/
 * New: https://asoose-storage-migration.s3.us-east-1.amazonaws.com/
 */
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const OLD = 'https://asoose-storage.s3.eu-north-1.amazonaws.com/';
const NEW = 'https://asoose-storage-migration.s3.us-east-1.amazonaws.com/';

async function main() {
  console.log(`Migrating image URLs:\n  OLD: ${OLD}\n  NEW: ${NEW}\n`);

  const results: { table: string; column: string; rows: number }[] = [];

  // ── Single-value string columns ──────────────────────────────────────────
  const stringCols: [string, string][] = [
    ['User', 'image'],
    ['Rider', 'image'],
    ['Vendor', 'image'],
    ['Store', 'logo'],
    ['Store', 'banner'],
    ['Banner', 'image'],
  ];

  for (const [model, col] of stringCols) {
    const r = await prisma.$executeRawUnsafe(
      `
      UPDATE "${model}"
      SET "${col}" = replace("${col}", $1, $2)
      WHERE "${col}" LIKE $3
    `,
      OLD,
      NEW,
      `%${OLD}%`,
    );
    results.push({ table: model, column: col, rows: r });
    console.log(`  ✅ ${model}.${col}: ${r} rows updated`);
  }

  // ── Array columns ────────────────────────────────────────────────────────
  const arrayCols: [string, string][] = [
    ['Product', 'images'],
    ['Dispute', '"evidenceImages"'],
  ];

  for (const [model, col] of arrayCols) {
    const r = await prisma.$executeRawUnsafe(
      `
      UPDATE "${model}"
      SET ${col} = ARRAY(
        SELECT replace(elem, $1, $2)
        FROM unnest(${col}) AS elem
      )
      WHERE ${col}::text LIKE $3
    `,
      OLD,
      NEW,
      `%${OLD}%`,
    );
    results.push({ table: model, column: col.replace(/"/g, ''), rows: r });
    console.log(`  ✅ ${model}.${col}: ${r} rows updated`);
  }

  console.log('\n🎉 Migration complete.');
  console.table(results);
}

main()
  .catch((e) => {
    console.error('❌', e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
