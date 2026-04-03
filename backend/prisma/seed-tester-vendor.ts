import 'dotenv/config';
import { PrismaClient, UserStatus, StoreStatus, VerificationStatus, StoreType } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

const ARGON2_OPTIONS: argon2.Options & { raw: false } = {
  type: argon2.argon2id,
  memoryCost: 65_536, // 64 MB in KiB
  timeCost: 3,
  parallelism: 4,
  raw: false,
};

async function main() {
  const email = 'tester@asoose.com';
  const password = 'AsooseTest2026!';
  
  console.log(`\n🚀 Seeding tester vendor account: ${email}\n`);

  // 1. Hash password (Argon2id)
  const hashedPassword = await argon2.hash(password, ARGON2_OPTIONS);

  // 2. Clear existing if any (to ensure fresh state for reviewer)
  const existingVendor = await prisma.vendor.findUnique({ where: { email } });
  if (existingVendor) {
    console.log(`♻️  Found existing tester vendor. Deleting to ensure fresh state...`);
    // Delete store first if exists
    const store = await prisma.store.findUnique({ where: { vendorId: existingVendor.id } });
    if (store) {
      await prisma.product.deleteMany({ where: { storeId: store.id } });
      await prisma.store.delete({ where: { id: store.id } });
    }
    await prisma.vendor.delete({ where: { id: existingVendor.id } });
  }

  // 3. Create Vendor + Store
  const vendor = await prisma.vendor.create({
    data: {
      email,
      name: 'Asoose Tester',
      password: hashedPassword,
      phone: '+2348036930772',
      countryCode: 'NG',
      businessType: 'Restaurant',
      employees: '1-5',
      status: UserStatus.ACTIVE,
      store: {
        create: {
          name: 'Asoose Demo Store',
          slug: 'asoose-demo-store-' + Math.floor(Math.random() * 10000),
          type: StoreType.RESTAURANT,
          description: 'This is a demo store for the App Store review process. It contains sample products and categorized menus to demonstrate the vendor dashboard capabilities.',
          status: StoreStatus.ACTIVE,
          verification: VerificationStatus.VERIFIED,
          isOpen: true,
          commissionRate: 10.0,
          prepTime: 15,
        }
      }
    },
    include: { store: true }
  });

  console.log(`✅  Vendor created: ${vendor.email}`);
  console.log(`✅  Store created: ${vendor.store?.name} (Status: ${vendor.store?.status})`);

  // 4. Ensure a Category exists for products
  let category = await prisma.category.findFirst({ where: { name: 'Main Dishes' } });
  if (!category) {
    category = await prisma.category.create({
      data: {
        name: 'Main Dishes',
        slug: 'main-dishes',
      }
    });
    console.log(`✅  Category created: ${category.name}`);
  }

  // 5. Add Sample Products
  if (vendor.store) {
    const products = [
      {
        name: 'Jollof Rice Special',
        price: 3500,
        description: 'Authentic Nigerian Jollof Rice served with grilled chicken and plantain.',
        slug: 'jollof-special-' + Math.floor(Math.random() * 1000)
      },
      {
        name: 'Pounded Yam & Egusi',
        price: 4500,
        description: 'Smooth pounded yam served with rich Egusi soup and assorted meat.',
        slug: 'pounded-yam-egusi-' + Math.floor(Math.random() * 1000)
      }
    ];

    for (const p of products) {
      await prisma.product.create({
        data: {
          ...p,
          storeId: vendor.store.id,
          categoryId: category.id,
          status: 'ACTIVE',
          stock: 99,
        }
      });
    }
    console.log(`✅  Added ${products.length} sample products to the store.`);
  }

  console.log(`\n🎉 Seeding complete! The account is ready for review.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
