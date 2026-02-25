/**
 * scripts/optimize-assets.js
 *
 * Pre-compress all PNG/JPG assets in the assets/ directory before bundling.
 * Run via:  node scripts/optimize-assets.js
 *           or:  yarn optimize-assets
 *
 * Requires:  npm install -D sharp glob
 *
 * What it does:
 *  - Converts PNGs → optimized PNG  (quality 80, strip metadata)
 *  - Converts JPGs/JPEGs → JPEG     (quality 82, progressive, strip metadata)
 *  - Resizes any image wider than MAX_WIDTH to MAX_WIDTH (preserving aspect ratio)
 *  - Overwrites in-place (safe to run repeatedly — unchanged files are skipped)
 */

const path = require("path");
const fs = require("fs");

const MAX_WIDTH = 1200; // pixels — anything wider gets scaled down

// Lazy-require so the script gives a clear error if sharp isn't installed
let sharp;
let glob;
try {
  sharp = require("sharp");
  glob = require("glob");
} catch {
  console.error(
    "Missing dependencies. Run:  npm install -D sharp glob\n" +
      "Then retry:               node scripts/optimize-assets.js",
  );
  process.exit(1);
}

const ASSETS_DIR = path.resolve(__dirname, "../assets");

async function optimizeFile(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  const img = sharp(filePath);
  const meta = await img.metadata();

  // Resize if too wide
  if (meta.width && meta.width > MAX_WIDTH) {
    img.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  let outputBuffer;
  if (ext === ".png") {
    outputBuffer = await img
      .png({ quality: 80, compressionLevel: 9, strip: true })
      .toBuffer();
  } else {
    outputBuffer = await img
      .jpeg({ quality: 82, progressive: true, strip: true })
      .toBuffer();
  }

  const originalSize = fs.statSync(filePath).size;
  if (outputBuffer.length < originalSize) {
    fs.writeFileSync(filePath, outputBuffer);
    const saved = ((originalSize - outputBuffer.length) / 1024).toFixed(1);
    console.log(`  ✓  ${path.relative(ASSETS_DIR, filePath)}  (-${saved} KB)`);
  } else {
    console.log(
      `  –  ${path.relative(ASSETS_DIR, filePath)}  (already optimal)`,
    );
  }
}

async function main() {
  const patterns = ["**/*.png", "**/*.jpg", "**/*.jpeg"];
  const files = patterns.flatMap((p) =>
    glob.sync(p, { cwd: ASSETS_DIR, absolute: true, nocase: true }),
  );

  if (files.length === 0) {
    console.log("No image assets found in", ASSETS_DIR);
    return;
  }

  console.log(`Optimizing ${files.length} image(s) in ${ASSETS_DIR}...\n`);
  for (const file of files) {
    try {
      await optimizeFile(file);
    } catch (err) {
      console.error(`  ✗  Failed: ${file}\n     ${err.message}`);
    }
  }
  console.log("\nDone.");
}

main();
