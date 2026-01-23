import { PrismaClient, StoreType, UserStatus, ProductStatus, VerificationStatus } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting Maiduguri Seed (7 Vendors, mixed verification)...');

  // 1. Setup Password
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('password123', salt);

  // 2. Ensure Category Exists
  const category = await prisma.category.upsert({
    where: { name: 'General Items' },
    update: {},
    create: { name: 'General Items', slug: 'general-items' }
  });

  // 3. Maiduguri Base Coordinates
  const BASE_LAT = 11.8311;
  const BASE_LNG = 13.1510;
  const storeTypes = Object.values(StoreType);

  // 4. Create 7 Vendors
  for (let i = 1; i <= 7; i++) {
    // Determine Verification Status: First 3 are PENDING (Not Verified), rest are VERIFIED
    const isUnverified = i <= 3;
    const verificationStatus = isUnverified ? VerificationStatus.PENDING : VerificationStatus.VERIFIED;
    const vendorStatus = isUnverified ? UserStatus.PENDING : UserStatus.ACTIVE; // Optional: Also set account status

    console.log(`Creating Vendor ${i} - Verification: ${verificationStatus}...`);

    // A. Create/Update Vendor
    const vendorEmail = `maiduguri_v${i}@demo.com`;
    const vendor = await prisma.vendor.upsert({
      where: { email: vendorEmail },
      update: { status: vendorStatus },
      create: {
        name: `Maiduguri Vendor ${i}`,
        email: vendorEmail,
        password,
        phone: `0803333333${i}`,
        countryCode: '+234',
        businessType: 'SME',
        employees: '1-10',
        status: vendorStatus,
        image: `https://picsum.photos/seed/vendor${i}/200/200` // Vendor Avatar
      },
    });

    // B. Create/Update Store
    const storeType = storeTypes[i % storeTypes.length];
    const storeName = `Maiduguri ${storeType} ${i}`;
    const storeSlug = `maiduguri-${storeType.toLowerCase()}-${i}`;

    const store = await prisma.store.upsert({
      where: { vendorId: vendor.id }, // Use vendorId to ensure 1-to-1 link
      update: {
        verification: verificationStatus, // Update verification status
        status: isUnverified ? 'PENDING' : 'ACTIVE',
        name: storeName,
        logo: `https://picsum.photos/seed/storelogo${i}/400/400`,
        banner: `https://picsum.photos/seed/storebanner${i}/1200/400`,
      },
      create: {
        name: storeName,
        slug: storeSlug,
        description: `Experience the best ${storeType.toLowerCase()} in Maiduguri.`,
        vendorId: vendor.id,
        type: storeType,
        status: isUnverified ? 'PENDING' : 'ACTIVE',
        verification: verificationStatus,
        address: `No. ${i} Baga Road, Maiduguri, Borno State`,
        lat: BASE_LAT + (Math.random() * 0.03 - 0.015),
        lng: BASE_LNG + (Math.random() * 0.03 - 0.015),
        logo: `https://picsum.photos/seed/storelogo${i}/400/400`,
        banner: `https://picsum.photos/seed/storebanner${i}/1200/400`,
        rating: 4.0 + (Math.random()),
        ratingCount: Math.floor(Math.random() * 100),
        prepTime: 15 + Math.floor(Math.random() * 20),
        commissionRate: 5.0
      },
    });

    // C. Create 5 Products per Store
    console.log(`   📦 Adding 5 products to ${storeName}...`);
    
    // Optional: Clear existing products to prevent duplicates during re-seed
    // await prisma.product.deleteMany({ where: { storeId: store.id } });

    const productsData = Array.from({ length: 5 }).map((_, j) => ({
      name: `${storeType} Product ${j + 1}`,
      slug: `prod-${i}-${j + 1}-${Date.now()}`,
      description: `High quality item ${j + 1} from ${storeName}.`,
      price: (j + 1) * 1500 + 500,
      images: [`https://picsum.photos/seed/prod${i}${j}/600/400`], // Product Image
      status: ProductStatus.ACTIVE,
      storeId: store.id,
      categoryId: category.id,
      stock: 20 + j,
    }));

    await prisma.product.createMany({
      data: productsData,
      skipDuplicates: true
    });
  }

  console.log('✅ Seeding completed!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });