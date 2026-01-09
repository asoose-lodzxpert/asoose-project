import { PrismaClient, StoreType, UserRole, UserStatus, ProductStatus, Prisma } from '@prisma/client'; // Added Prisma import
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// --- DATA LISTS FOR RANDOM GENERATION ---
const CITIES = [
  { name: 'Lagos', lat: 6.5244, lng: 3.3792 },
  { name: 'Abuja', lat: 9.0765, lng: 7.3986 },
  { name: 'Port Harcourt', lat: 4.8156, lng: 7.0498 },
  { name: 'Ibadan', lat: 7.3775, lng: 3.9470 }
];

const STORE_PREFIXES = {
  [StoreType.RESTAURANT]: ['Mama', 'Tasty', 'Spicy', 'Royal', 'Urban', 'Golden', 'Chef'],
  [StoreType.GROCERY]: ['Fresh', 'Daily', 'Super', 'Hyper', 'Green', 'Organic'],
  [StoreType.PHARMACY]: ['Health', 'Medi', 'Care', 'Life', 'Wellness'],
  [StoreType.MARKET]: ['City', 'Main', 'Village', 'Corner']
};

const STORE_SUFFIXES = {
  [StoreType.RESTAURANT]: ['Kitchen', 'Bistro', 'Grill', 'Spot', 'Buka', 'Diner'],
  [StoreType.GROCERY]: ['Mart', 'Store', 'Market', 'Grocers', 'Essentials'],
  [StoreType.PHARMACY]: ['Pharmacy', 'Chemist', 'Drugs', 'Plus'],
  [StoreType.MARKET]: ['Plaza', 'Center', 'Hub', 'Traders']
};

async function main() {
  console.log('🌱 Starting database seed...');

  // 1. Cryptography
  const salt = await bcrypt.genSalt(10);
  const password = await bcrypt.hash('password123', salt);

  // 2. Create Categories
  console.log('📂 Seeding Categories...');
  const categories = await Promise.all([
    prisma.category.upsert({ where: { name: 'Fast Food' }, update: {}, create: { name: 'Fast Food' } }),
    prisma.category.upsert({ where: { name: 'African Dishes' }, update: {}, create: { name: 'African Dishes' } }),
    prisma.category.upsert({ where: { name: 'Drinks' }, update: {}, create: { name: 'Drinks' } }),
    prisma.category.upsert({ where: { name: 'Vegetables' }, update: {}, create: { name: 'Vegetables' } }),
    prisma.category.upsert({ where: { name: 'Medicine' }, update: {}, create: { name: 'Medicine' } }),
    prisma.category.upsert({ where: { name: 'Electronics' }, update: {}, create: { name: 'Electronics' } }),
  ]);

  // 3. Create 20 Unique Stores with Vendors
  console.log('🏪 Seeding 20 Vendors & Stores...');

  const storeTypes = Object.values(StoreType); 

  for (let i = 1; i <= 20; i++) {
    const type = storeTypes[i % storeTypes.length]; 
    const city = CITIES[i % CITIES.length];
    
    const prefix = STORE_PREFIXES[type][i % STORE_PREFIXES[type].length];
    const suffix = STORE_SUFFIXES[type][i % STORE_SUFFIXES[type].length];
    const storeName = `${prefix} ${suffix} ${city.name}`;
    const slug = `${storeName.toLowerCase().replace(/ /g, '-')}-${i}`;
    
    const lat = city.lat + (Math.random() * 0.02 - 0.01); 
    const lng = city.lng + (Math.random() * 0.02 - 0.01);
    const color = type === 'RESTAURANT' ? 'orange' : type === 'GROCERY' ? 'green' : type === 'PHARMACY' ? 'blue' : 'purple';

    // B. Create Vendor First (Fixed missing 'employees')
    const vendor = await prisma.vendor.upsert({
      where: { email: `vendor${i}@demo.com` },
      update: {},
      create: {
        email: `vendor${i}@demo.com`,
        name: `Vendor Owner ${i}`,
        password,
        phone: `080${i.toString().padStart(8, '0')}`,
        countryCode: '+234',
        businessType: 'SME',
        employees: '1-10', // <--- FIXED: Added this required field
        status: UserStatus.ACTIVE,
      },
    });

    // C. Create Store
    const store = await prisma.store.upsert({
      where: { slug },
      update: {},
      create: {
        name: storeName,
        slug,
        description: `The best ${type.toLowerCase()} service in ${city.name}. Quality guaranteed.`,
        vendorId: vendor.id,
        type: type,
        status: 'ACTIVE',
        verification: 'VERIFIED',
        address: `${i * 12} ${city.name} Main Road`,
        lat,
        lng,
        logo: `https://placehold.co/400x400/${color}/white?text=${prefix.charAt(0)}${suffix.charAt(0)}`,
        banner: `https://placehold.co/1200x400/${color}/white?text=${storeName.replace(/ /g, '+')}`,
        rating: Number((3.5 + Math.random() * 1.5).toFixed(1)),
        ratingCount: Math.floor(Math.random() * 500),
      },
    });

    // D. Add Random Products (Fixed Array Type)
    const numProducts = Math.floor(Math.random() * 5) + 3;
    // Explicitly define the array type here so TypeScript knows what it holds
    const productData: Prisma.ProductCreateManyInput[] = []; 

    for (let j = 1; j <= numProducts; j++) {
      let productName = `${prefix} Item ${j}`;
      let catId = categories[0].id;
      let price = 1000;

      if (type === 'RESTAURANT') {
        productName = j % 2 === 0 ? 'Jollof Combo' : 'Fried Rice Special';
        catId = categories[0].id; 
        price = 2500 + (j * 100);
      } else if (type === 'GROCERY') {
        productName = j % 2 === 0 ? 'Fresh Tubers' : 'Crate of Eggs';
        catId = categories[3].id; 
        price = 1200 + (j * 50);
      } else if (type === 'PHARMACY') {
        productName = 'Vitamin C Pack';
        catId = categories[4].id; 
        price = 500;
      }

      productData.push({
        name: `${productName} ${i}-${j}`, 
        slug: `${productName.toLowerCase().replace(/ /g, '-')}-${i}-${j}`,
        price: price,
        image: `https://placehold.co/600x400/${color}/white?text=${productName.replace(/ /g, '+')}`,
        storeId: store.id,
        categoryId: catId,
        status: ProductStatus.ACTIVE,
        stock: Math.floor(Math.random() * 50),
      });
    }

    await prisma.product.createMany({
      data: productData,
      skipDuplicates: true,
    });
  }

  console.log('✅ Seeding completed: 20 Stores created!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });