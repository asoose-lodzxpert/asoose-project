import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting seed...');

  await prisma.systemSetting.createMany({
    data: [
      { key: 'PLATFORM_COMMISSION', value: '10', description: 'Platform commission percentage', category: 'FINANCE' },
      { key: 'MIN_ORDER_AMOUNT', value: '500', description: 'Minimum order amount in NGN', category: 'ORDER' },
      { key: 'DELIVERY_BASE_FEE', value: '300', description: 'Base delivery fee in NGN', category: 'DELIVERY' },
    ],
    skipDuplicates: true,
  });

  await prisma.bank.createMany({
    data: [
      { name: 'Access Bank', code: '044', isActive: true },
      { name: 'GTBank', code: '058', isActive: true },
      { name: 'First Bank', code: '011', isActive: true },
      { name: 'Zenith Bank', code: '057', isActive: true },
      { name: 'UBA', code: '033', isActive: true },
    ],
    skipDuplicates: true,
  });

  await prisma.category.createMany({
    data: [
      { slug: 'fast-food', name: 'Fast Food' },
      { slug: 'groceries', name: 'Groceries' },
      { slug: 'pharmacy', name: 'Pharmacy' },
      { slug: 'beverages', name: 'Beverages' },
      { slug: 'snacks', name: 'Snacks' },
    ],
    skipDuplicates: true,
  });

  const hashedPassword = await bcrypt.hash('password123', 10);

  const customer1 = await prisma.user.upsert({
    where: { email: 'customer@test.com' },
    update: {},
    create: {
      email: 'customer@test.com',
      password: hashedPassword,
      name: 'Amina Hassan',
      phone: '+2348012345678',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    },
  });

  const customer2 = await prisma.user.upsert({
    where: { email: 'jane@test.com' },
    update: {},
    create: {
      email: 'jane@test.com',
      password: hashedPassword,
      name: 'Fatima Usman',
      phone: '+2348098765432',
      role: 'CUSTOMER',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: 'admin@test.com' },
    update: {},
    create: {
      email: 'admin@test.com',
      password: hashedPassword,
      name: 'Admin User',
      phone: '+2348011111111',
      role: 'SUPER_ADMIN',
      status: 'ACTIVE',
      verificationStatus: 'VERIFIED',
    },
  });

  await prisma.address.createMany({
    data: [
      {
        userId: customer1.id,
        label: 'Home',
        street: 'Plot 15 Kashim Ibrahim Road',
        city: 'Maiduguri',
        state: 'Borno',
        lat: 11.8333,
        lng: 13.1500,
        isDefault: true,
      },
      {
        userId: customer1.id,
        label: 'Office',
        street: '23 Bama Road, GRA',
        city: 'Maiduguri',
        state: 'Borno',
        lat: 11.8456,
        lng: 13.1612,
        isDefault: false,
      },
      {
        userId: customer2.id,
        label: 'Home',
        street: '10 Old Maiduguri Road',
        city: 'Maiduguri',
        state: 'Borno',
        lat: 11.8123,
        lng: 13.1289,
        isDefault: true,
      },
    ],
    skipDuplicates: true,
  });

  const vendor1 = await prisma.vendor.upsert({
    where: { email: 'vendor@test.com' },
    update: {},
    create: {
      email: 'vendor@test.com',
      password: hashedPassword,
      name: 'Musa Ibrahim',
      countryCode: '+234',
      phone: '8022222222',
      businessType: 'RESTAURANT',
      employees: '5-10',
      status: 'ACTIVE',
    },
  });

  const vendor2 = await prisma.vendor.upsert({
    where: { email: 'pharmacy@test.com' },
    update: {},
    create: {
      email: 'pharmacy@test.com',
      password: hashedPassword,
      name: 'Aisha Mohammed',
      countryCode: '+234',
      phone: '8033333333',
      businessType: 'PHARMACY',
      employees: '1-5',
      status: 'ACTIVE',
    },
  });

  const store1 = await prisma.store.upsert({
    where: { vendorId: vendor1.id },
    update: {},
    create: {
      vendorId: vendor1.id,
      name: 'Sahel Delights Restaurant',
      description: 'Authentic Northern Nigerian cuisine and continental dishes',
      slug: 'sahel-delights',
      type: 'RESTAURANT',
      address: 'Shop 45, Monday Market Plaza, Maiduguri',
      lat: 11.8367,
      lng: 13.1534,
      status: 'ACTIVE',
      verification: 'VERIFIED',
      prepTime: 25,
      isOpen: true,
      commissionRate: 12.5,
      rating: 4.5,
      ratingCount: 120,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { vendorId: vendor2.id },
    update: {},
    create: {
      vendorId: vendor2.id,
      name: 'Borno HealthCare Pharmacy',
      description: 'Quality healthcare products and trusted medications',
      slug: 'borno-healthcare-pharmacy',
      type: 'PHARMACY',
      address: 'No 12 Sir Kashim Ibrahim Way, Maiduguri',
      lat: 11.8298,
      lng: 13.1478,
      status: 'ACTIVE',
      verification: 'VERIFIED',
      prepTime: 15,
      isOpen: true,
      commissionRate: 10.0,
      rating: 4.8,
      ratingCount: 85,
    },
  });

  await prisma.openingHour.createMany({
    data: [
      { storeId: store1.id, dayOfWeek: 1, openTime: '08:00', closeTime: '22:00' },
      { storeId: store1.id, dayOfWeek: 2, openTime: '08:00', closeTime: '22:00' },
      { storeId: store1.id, dayOfWeek: 3, openTime: '08:00', closeTime: '22:00' },
      { storeId: store1.id, dayOfWeek: 4, openTime: '08:00', closeTime: '22:00' },
      { storeId: store1.id, dayOfWeek: 5, openTime: '08:00', closeTime: '23:00' },
      { storeId: store1.id, dayOfWeek: 6, openTime: '09:00', closeTime: '23:00' },
      { storeId: store1.id, dayOfWeek: 0, openTime: '10:00', closeTime: '22:00' },
    ],
    skipDuplicates: true,
  });

  const categories = await prisma.category.findMany();
  const fastFood = categories.find(c => c.slug === 'fast-food')!;
  const pharmacy = categories.find(c => c.slug === 'pharmacy')!;
  const beverages = categories.find(c => c.slug === 'beverages')!;

  const product1 = await prisma.product.upsert({
    where: { slug: 'jollof-rice-chicken' },
    update: {},
    create: {
      name: 'Jollof Rice with Chicken',
      slug: 'jollof-rice-chicken',
      description: 'Our signature jollof rice served with grilled chicken',
      price: 2500,
      images: ['https://placeholder.co/400x300'],
      status: 'ACTIVE',
      stock: 50,
      inventory: 50,
      salesCount: 45,
      storeId: store1.id,
      categoryId: fastFood.id,
    },
  });

  const product2 = await prisma.product.upsert({
    where: { slug: 'tuwo-shinkafa' },
    update: {},
    create: {
      name: 'Tuwo Shinkafa with Miyan Kuka',
      slug: 'tuwo-shinkafa',
      description: 'Traditional Northern delicacy with baobab leaf soup',
      price: 2000,
      images: ['https://placeholder.co/400x300'],
      status: 'ACTIVE',
      stock: 30,
      inventory: 30,
      salesCount: 32,
      storeId: store1.id,
      categoryId: fastFood.id,
    },
  });

  const product3 = await prisma.product.upsert({
    where: { slug: 'paracetamol-500mg' },
    update: {},
    create: {
      name: 'Paracetamol 500mg (Pack of 10)',
      slug: 'paracetamol-500mg',
      description: 'Effective pain relief and fever reduction',
      price: 350,
      images: ['https://placeholder.co/400x300'],
      status: 'ACTIVE',
      stock: 200,
      inventory: 200,
      salesCount: 150,
      storeId: store2.id,
      categoryId: pharmacy.id,
    },
  });

  const product4 = await prisma.product.upsert({
    where: { slug: 'fura-da-nono' },
    update: {},
    create: {
      name: 'Fura da Nono',
      slug: 'fura-da-nono',
      description: 'Refreshing traditional millet and yogurt drink',
      price: 400,
      images: ['https://placeholder.co/400x300'],
      status: 'ACTIVE',
      stock: 100,
      inventory: 100,
      salesCount: 89,
      storeId: store1.id,
      categoryId: beverages.id,
    },
  });

  const modifierGroup1 = await prisma.modifierGroup.create({
    data: {
      productId: product1.id,
      name: 'Protein Choice',
      minSelect: 0,
      maxSelect: 2,
      modifiers: {
        create: [
          { name: 'Extra Chicken', price: 500 },
          { name: 'Fish', price: 600 },
          { name: 'Beef', price: 450 },
        ],
      },
    },
  });

  const rider1 = await prisma.rider.upsert({
    where: { email: 'rider@test.com' },
    update: {},
    create: {
      email: 'rider@test.com',
      password: hashedPassword,
      name: 'Yusuf Babangida',
      countryCode: '+234',
      phone: '8044444444',
      role: 'RIDER',
      status: 'ACTIVE',
      isOnline: true,
      currentLat: 11.8333,
      currentLng: 13.1500,
      walletBalance: 15000,
      commissionRate: 20.0,
      rating: 4.7,
      totalRides: 250,
    },
  });

  const rider2 = await prisma.rider.upsert({
    where: { email: 'driver@test.com' },
    update: {},
    create: {
      email: 'driver@test.com',
      password: hashedPassword,
      name: 'Abdullahi Musa',
      countryCode: '+234',
      phone: '8055555555',
      role: 'DRIVER',
      status: 'ACTIVE',
      isOnline: true,
      currentLat: 11.8456,
      currentLng: 13.1612,
      walletBalance: 22000,
      commissionRate: 18.0,
      rating: 4.9,
      totalRides: 420,
    },
  });

  await prisma.vehicle.create({
    data: {
      riderId: rider2.id,
      type: 'SEDAN',
      brand: 'Toyota',
      model: 'Corolla',
      plateNumber: 'BOR-123-XY',
      color: 'Silver',
      year: 2020,
    },
  });

  await prisma.bankAccount.createMany({
    data: [
      {
        storeId: store1.id,
        bankName: 'Access Bank',
        bankCode: '044',
        accountNumber: '0123456789',
        accountName: 'Sahel Delights Restaurant',
        paystackRecipientCode: 'RCP_test123',
      },
      {
        riderId: rider1.id,
        bankName: 'GTBank',
        bankCode: '058',
        accountNumber: '9876543210',
        accountName: 'Yusuf Babangida',
        paystackRecipientCode: 'RCP_test456',
      },
    ],
    skipDuplicates: true,
  });

  const customerAddresses = await prisma.address.findMany({ where: { userId: customer1.id } });
  const pickupAddr = customerAddresses[0];
  const dropoffAddr = customerAddresses[1];

  const order1 = await prisma.order.create({
    data: {
      userId: customer1.id,
      storeId: store1.id,
      total: 5700,
      status: 'DELIVERED',
      paymentStatus: 'PAID',
      deliveredAt: new Date(Date.now() - 86400000 * 2),
      items: {
        create: [
          {
            productId: product1.id,
            nameSnap: 'Jollof Rice with Chicken',
            quantity: 2,
            price: 2500,
            selectedOptions: { protein: 'Extra Chicken' },
          },
          {
            productId: product4.id,
            nameSnap: 'Fura da Nono',
            quantity: 2,
            price: 400,
          },
        ],
      },
    },
  });

  const order2 = await prisma.order.create({
    data: {
      userId: customer1.id,
      storeId: store1.id,
      total: 2000,
      status: 'PREPARING',
      paymentStatus: 'PAID',
      items: {
        create: [
          {
            productId: product2.id,
            nameSnap: 'Tuwo Shinkafa with Miyan Kuka',
            quantity: 1,
            price: 2000,
          },
        ],
      },
    },
  });

  const payment1 = await prisma.payment.create({
    data: {
      orderId: order1.id,
      userId: customer1.id,
      amount: 5700,
      method: 'CARD',
      status: 'COMPLETED',
      reference: `PAY_${Date.now()}_1`,
      gateway: 'PAYSTACK',
      transactionId: `TXN_${Date.now()}_1`,
      customerEmail: customer1.email,
      customerName: customer1.name,
      paidAt: new Date(Date.now() - 86400000 * 2),
      verifiedAt: new Date(Date.now() - 86400000 * 2),
    },
  });

  await prisma.delivery.create({
    data: {
      orderId: order1.id,
      customerId: customer1.id,
      riderId: rider1.id,
      pickupAddressId: pickupAddr.id,
      dropoffAddressId: dropoffAddr.id,
      status: 'DELIVERED',
      recipientName: customer1.name,
      recipientPhone: customer1.phone!,
      deliveryFee: 500,
      distanceKm: 5.2,
      deliveryOtp: '1234',
      assignedAt: new Date(Date.now() - 86400000 * 2 + 600000),
      pickedUpAt: new Date(Date.now() - 86400000 * 2 + 1800000),
      deliveredAt: new Date(Date.now() - 86400000 * 2 + 3600000),
    },
  });

  const ride1 = await prisma.ride.create({
    data: {
      customerId: customer2.id,
      riderId: rider2.id,
      pickupAddressId: customerAddresses[0].id,
      dropoffAddressId: customerAddresses[1].id,
      status: 'COMPLETED',
      baseFare: 500,
      distanceFare: 1200,
      timeFare: 300,
      platformFee: 200,
      driverFee: 1600,
      totalFare: 2000,
      distanceKm: 8.5,
      durationMin: 25,
      startOtp: '5678',
      acceptedAt: new Date(Date.now() - 7200000),
      startedAt: new Date(Date.now() - 5400000),
      completedAt: new Date(Date.now() - 3600000),
    },
  });

  await prisma.payment.create({
    data: {
      rideId: ride1.id,
      userId: customer2.id,
      amount: 2000,
      method: 'WALLET',
      status: 'COMPLETED',
      reference: `RIDE_PAY_${Date.now()}`,
      gateway: 'PAYSTACK',
      transactionId: `RIDE_TXN_${Date.now()}`,
      customerEmail: customer2.email,
      customerName: customer2.name,
      paidAt: new Date(Date.now() - 3600000),
      verifiedAt: new Date(Date.now() - 3600000),
    },
  });

  await prisma.transaction.createMany({
    data: [
      {
        type: 'PAYMENT_RECEIVED',
        amount: 5700,
        entityType: 'PLATFORM',
        entityId: 'platform',
        paymentId: payment1.id,
        orderId: order1.id,
        balanceBefore: 0,
        balanceAfter: 5700,
        description: 'Payment received for order',
        status: 'COMPLETED',
      },
      {
        type: 'COMMISSION_DEDUCTED',
        amount: 712.50,
        entityType: 'PLATFORM',
        entityId: 'platform',
        orderId: order1.id,
        balanceBefore: 5700,
        balanceAfter: 6412.50,
        description: 'Platform commission (12.5%)',
        status: 'COMPLETED',
        metadata: { commissionRate: 12.5 },
      },
      {
        type: 'VENDOR_EARNING',
        amount: 4987.50,
        entityType: 'STORE',
        entityId: store1.id,
        orderId: order1.id,
        balanceBefore: 0,
        balanceAfter: 4987.50,
        description: 'Vendor earning after commission',
        status: 'COMPLETED',
      },
    ],
  });

  await prisma.review.createMany({
    data: [
      {
        userId: customer1.id,
        storeId: store1.id,
        rating: 5,
        comment: 'Amazing authentic Northern food! The Tuwo was perfectly made.',
      },
      {
        userId: customer2.id,
        storeId: store2.id,
        rating: 4,
        comment: 'Good pharmacy service, helpful staff',
      },
    ],
    skipDuplicates: true,
  });

  await prisma.banner.createMany({
    data: [
      {
        title: 'Welcome to Maiduguri!',
        subtitle: 'Get 20% off on all orders above ₦5,000',
        buttonText: 'Order Now',
        link: '/stores',
        type: 'PROMO',
        isActive: true,
        priority: 1,
      },
      {
        title: 'Free Delivery in Maiduguri',
        subtitle: 'Free delivery on your first 3 orders',
        buttonText: 'Explore',
        link: '/stores',
        type: 'PROMO',
        isActive: true,
        priority: 2,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.serviceZone.createMany({
    data: [
      {
        name: 'Maiduguri Central',
        description: 'Coverage for central Maiduguri including GRA, Monday Market, and Bama Road areas',
        coordinates: [
          { lat: 11.8333, lng: 13.1500 },
          { lat: 11.8456, lng: 13.1612 },
          { lat: 11.8298, lng: 13.1478 },
          { lat: 11.8367, lng: 13.1534 },
          { lat: 11.8123, lng: 13.1289 },
        ],
        isActive: true,
        basePriceMultiplier: 1.0,
      },
    ],
    skipDuplicates: true,
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: customer1.id,
        title: 'Order Delivered',
        message: 'Your order has been delivered successfully',
        type: 'ORDER',
        category: 'ORDER_UPDATE',
        isRead: false,
        metadata: { orderId: order1.id },
      },
      {
        vendorId: vendor1.id,
        title: 'New Order',
        message: 'You have a new order #' + order2.id.slice(0, 8),
        type: 'ORDER',
        category: 'ORDER_CREATED',
        isRead: false,
        metadata: { orderId: order2.id },
      },
    ],
  });

  console.log('✅ Seed completed successfully!');
  console.log('\n📍 Location: Maiduguri, Borno State');
  console.log('\n📊 Summary:');
  console.log('- Users: 3 (2 customers, 1 admin)');
  console.log('- Vendors: 2');
  console.log('- Stores: 2 (Sahel Delights, Borno HealthCare Pharmacy)');
  console.log('- Products: 4 (including Tuwo Shinkafa & Fura da Nono)');
  console.log('- Riders: 2');
  console.log('- Orders: 2');
  console.log('- Rides: 1');
  console.log('- Deliveries: 1');
  console.log('- Categories: 5');
  console.log('- Banks: 5');
  console.log('- Service Zone: Maiduguri Central');
  console.log('\n🔐 Test Credentials:');
  console.log('Customer: customer@test.com / password123');
  console.log('Vendor: vendor@test.com / password123');
  console.log('Rider: rider@test.com / password123');
  console.log('Admin: admin@test.com / password123');
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });