import { S3Client, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { fromIni } from '@aws-sdk/credential-providers';
import { readFileSync, writeFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

const BUCKET = 'asoose-storage-migration';
const PREFIX = 'uploads/items/';
const BASE_URL = `https://${BUCKET}.s3.amazonaws.com/${PREFIX}`;
const ITEMS_FILE = join(
  __dirname,
  'raw_data',
  'todays-store-maiduguri-items.json',
);

const s3 = new S3Client({
  region: 'us-east-1',
  credentials: fromIni({ profile: 'new-account' }),
});

async function listAllKeys() {
  const keys = new Set();
  let continuationToken;
  let page = 0;

  do {
    page++;
    const cmd = new ListObjectsV2Command({
      Bucket: BUCKET,
      Prefix: PREFIX,
      ContinuationToken: continuationToken,
    });
    const res = await s3.send(cmd);
    for (const obj of res.Contents ?? []) {
      const filename = obj.Key.split('/').pop();
      keys.add(filename);
    }
    continuationToken = res.NextContinuationToken;
    process.stdout.write(`\rPage ${page} — ${keys.size} keys so far...`);
  } while (continuationToken);

  console.log(`\nTotal S3 keys: ${keys.size}`);
  return keys;
}

async function main() {
  console.log('Listing S3 objects...');
  const s3Keys = await listAllKeys();

  console.log('Loading items JSON...');
  const items = JSON.parse(readFileSync(ITEMS_FILE, 'utf8'));

  let matched = 0;
  let notFound = 0;

  for (const item of items) {
    const filename = `${item._id}.jpg`;
    if (s3Keys.has(filename)) {
      item.thumbnailUrl = `${BASE_URL}${filename}`;
      matched++;
    } else {
      notFound++;
    }
  }

  console.log(`Matched (URL updated): ${matched}`);
  console.log(`Not found in S3      : ${notFound}`);

  writeFileSync(ITEMS_FILE, JSON.stringify(items, null, 2), 'utf8');
  console.log('Saved updated JSON.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
