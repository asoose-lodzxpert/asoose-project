import {
  PrismaClient,
  StoreType,
  UserStatus,
  ProductStatus,
  VerificationStatus,
} from '@prisma/client';
import { nigerianBanks } from './banks-seed';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  // Seed banks if not already present
  for (const bank of nigerianBanks) {
    await prisma.bank.upsert({
      where: { name: bank.name },
      update: { code: bank.code, isActive: true },
      create: { name: bank.name, code: bank.code, isActive: true },
    });
  }

  // Fetch all active banks
  const banks = await prisma.bank.findMany({ where: { isActive: true } });
  console.log('Starting Maiduguri Seed (7 Vendors, mixed verification)...');

  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('password123', salt);

  const category = await prisma.category.upsert({
    where: { name: 'General Items' },
    update: {},
    create: { name: 'General Items', slug: 'general-items' },
  });

  const BASE_LAT = 11.8311;
  const BASE_LNG = 13.151;
  const storeTypes = Object.values(StoreType);

  for (let i = 1; i <= 7; i++) {
    const isUnverified = i <= 3;
    const verificationStatus = isUnverified
      ? VerificationStatus.PENDING
      : VerificationStatus.VERIFIED;
    const vendorStatus = isUnverified ? UserStatus.PENDING : UserStatus.ACTIVE;

    console.log(
      `Creating Vendor ${i} - Verification: ${verificationStatus}...`,
    );

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
        image: `https://picsum.photos/seed/vendor${i}/200/200`, // Vendor Avatar
      },
    });

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
        rating: 4.0 + Math.random(),
        ratingCount: Math.floor(Math.random() * 100),
        prepTime: 15 + Math.floor(Math.random() * 20),
        commissionRate: 5.0,
      },
    });

    // Link a random bank to the store as a bank account
    if (banks.length > 0) {
      const bank = banks[Math.floor(Math.random() * banks.length)];
      await prisma.bankAccount.upsert({
        where: { storeId: store.id },
        update: {},
        create: {
          storeId: store.id,
          bankName: bank.name,
          bankCode: bank.code,
          accountNumber: `00000${i}${Math.floor(Math.random() * 10000)}`.slice(
            -10,
          ),
          accountName: `Maiduguri Vendor ${i}`,
        },
      });
    }

    console.log(`   Adding 5 products to ${storeName}...`);

    const productsData = Array.from({ length: 5 }).map((_, j) => ({
      name: `${storeType} Product ${j + 1}`,
      slug: `prod-${i}-${j + 1}-${Date.now()}`,
      description: `High quality item ${j + 1} from ${storeName}.`,
      price: (j + 1) * 1500 + 500,
      images: [`https://picsum.photos/seed/prod${i}${j}/600/400`],
      status: ProductStatus.ACTIVE,
      storeId: store.id,
      categoryId: category.id,
      stock: 20 + j,
    }));

    await prisma.product.createMany({
      data: productsData,
      skipDuplicates: true,
    });
  }

  console.log('Seeding completed!');
}

main()
  .catch((e) => {
    console.error('Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
