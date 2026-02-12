// 02-vendors-products.ts
import { prisma, MAIDUGURI_COORDS, PASSWORD_HASH } from './seed-utils';
import {
  StoreType,
  UserStatus,
  StoreStatus,
  ProductStatus,
  VerificationStatus,
} from '@prisma/client';

export async function seedVendorsAndProducts() {
  console.log('🌱 Seeding Vendors, Stores, and Products...');

  const storeTypes = [
    StoreType.RESTAURANT,
    StoreType.RESTAURANT,
    StoreType.GROCERY,
    StoreType.PHARMACY,
    StoreType.MARKET,
  ];

  // Create 3 Vendors per Store Type (approx 15 total)
  let vendorCounter = 1;

  for (const type of storeTypes) {
    for (let i = 0; i < 3; i++) {
      const email = `vendor_${type.toLowerCase()}_${i + 1}@example.com`;

      // 1. Create Vendor Account
      const vendor = await prisma.vendor.upsert({
        where: { email },
        update: {},
        create: {
          email,
          password: PASSWORD_HASH,
          name: `Maiduguri ${type} Vendor ${i + 1}`,
          phone: `+23480222222${vendorCounter}`,
          status: UserStatus.ACTIVE,
          countryCode: 'NG',
          businessType: 'SME',
          employees: '1-10',
        },
      });

      // 2. Create Store associated with Vendor
      const storeName = `${type} Spot ${vendorCounter}`;
      const storeSlug = storeName.toLowerCase().replace(/ /g, '-');

      const store = await prisma.store.upsert({
        where: { vendorId: vendor.id }, // Unique constraint
        update: {},
        create: {
          vendorId: vendor.id,
          name: storeName,
          slug: storeSlug,
          type: type,
          status: StoreStatus.ACTIVE,
          verification: VerificationStatus.VERIFIED,
          lat: MAIDUGURI_COORDS.lat + Math.random() * 0.005,
          lng: MAIDUGURI_COORDS.lng + Math.random() * 0.005,
          isOpen: true,
          commissionRate: 10.0,
          walletBalance: 0, // Updated in Ledger Seed
        },
      });

      // 3. Create Bank Account (Required for Payouts)
      await prisma.bankAccount.upsert({
        where: { storeId: store.id },
        update: {},
        create: {
          storeId: store.id,
          bankName: 'Access Bank',
          bankCode: '044',
          accountNumber: `00000000${vendorCounter.toString().padStart(2, '0')}`,
          accountName: store.name,
          currency: 'NGN',
        },
      });

      // 4. Create Products
      const catSlug =
        type === 'PHARMACY'
          ? 'pharmacy'
          : type === 'GROCERY'
            ? 'groceries'
            : 'rice-bowls';
      const category = await prisma.category.findUnique({
        where: { slug: catSlug },
      });

      if (category) {
        await prisma.product.createMany({
          data: [
            {
              name: `${storeName} Item A`,
              slug: `${storeSlug}-item-a`,
              price: 1500.0 + i * 100,
              storeId: store.id,
              categoryId: category.id,
              status: ProductStatus.ACTIVE,
              stock: 50,
            },
            {
              name: `${storeName} Item B`,
              slug: `${storeSlug}-item-b`,
              price: 2500.0,
              storeId: store.id,
              categoryId: category.id,
              status: ProductStatus.ACTIVE,
              stock: 20,
            },
          ],
          skipDuplicates: true,
        });
      }

      vendorCounter++;
    }
  }
}
