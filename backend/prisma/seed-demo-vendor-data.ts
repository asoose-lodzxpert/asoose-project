import 'dotenv/config';
import { PrismaClient, OrderStatus, User } from '@prisma/client';
import { randomUUID } from 'crypto';

const prisma = new PrismaClient();

async function main() {
  const vendorEmail = 'tester@asoose.com';
  
  console.log(`\n📦 Seeding demo data for vendor: ${vendorEmail}\n`);

  const vendor = await prisma.vendor.findUnique({
    where: { email: vendorEmail },
    include: { store: true }
  });

  if (!vendor || !vendor.store) {
    console.error('❌ Vendor or Store not found. Please run the vendor seed script first.');
    return;
  }

  const storeId = vendor.store.id;

  // Clear existing orders and notifications for the vendor
  console.log('🚮 Clearing existing demo data...');
  await prisma.notification.deleteMany({ where: { vendorId: vendor.id } });
  await prisma.order.deleteMany({ where: { storeId } });

  // 1. Create/Find some demo customers
  const customerEmails = ['alice@example.com', 'bob@example.com', 'charlie@example.com', 'david@example.com'];
  const customers: User[] = [];

  for (const email of customerEmails) {
    const customer = await prisma.user.upsert({
      where: { email },
      update: {},
      create: {
        email,
        name: email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1),
        password: 'hashed_password', // won't be used
        role: 'CUSTOMER',
        status: 'ACTIVE',
      }
    });
    customers.push(customer);
  }
  console.log(`✅ Found/Created ${customers.length} demo customers.`);

  // 2. Get some products from the store
  const products = await prisma.product.findMany({ where: { storeId } });
  if (products.length === 0) {
    console.error('❌ No products found for the store. Please add products first.');
    return;
  }

  // 3. Seed Orders
  console.log('🛒 Seeding orders...');
  const orderData = [
    { status: OrderStatus.PENDING, minutesAgo: 5, customer: customers[0] },
    { status: OrderStatus.PENDING, minutesAgo: 15, customer: customers[1] },
    { status: OrderStatus.CONFIRMED, minutesAgo: 30, customer: customers[2] },
    { status: OrderStatus.PREPARING, minutesAgo: 45, customer: customers[3] },
    { status: OrderStatus.PREPARING, minutesAgo: 60, customer: customers[0] },
    { status: OrderStatus.READY, minutesAgo: 90, customer: customers[1] },
    { status: OrderStatus.READY, minutesAgo: 120, customer: customers[2] },
    { status: OrderStatus.DELIVERED, minutesAgo: 180, customer: customers[3] },
    { status: OrderStatus.DELIVERED, minutesAgo: 240, customer: customers[0] },
    { status: OrderStatus.CANCELLED, minutesAgo: 300, customer: customers[1] },
    { status: OrderStatus.DELIVERED, minutesAgo: 1440, customer: customers[2] }, // Yesterday
    { status: OrderStatus.DELIVERED, minutesAgo: 1500, customer: customers[3] },
  ];

  for (const data of orderData) {
    const createdAt = new Date(Date.now() - data.minutesAgo * 60000);
    const order = await prisma.order.create({
      data: {
        userId: data.customer.id,
        storeId: storeId,
        total: products[0].price,
        status: data.status,
        paymentStatus: 'PAID',
        createdAt: createdAt,
        updatedAt: createdAt,
        items: {
          create: {
            productId: products[0].id,
            nameSnap: products[0].name,
            quantity: 1,
            price: products[0].price,
          }
        }
      }
    });

    // 4. Create Notifications for these orders
    if (data.status === OrderStatus.PENDING) {
        await prisma.notification.create({
            data: {
                vendorId: vendor.id,
                title: 'New Order Received!',
                message: `You have a new order from ${data.customer.name} (#${order.id.slice(0, 8)})`,
                type: 'ORDER',
                category: 'ORDER_CREATED',
                isRead: false,
                metadata: { orderId: order.id },
                createdAt: createdAt
            }
        });
    } else if (data.status === OrderStatus.CANCELLED) {
        await prisma.notification.create({
            data: {
                vendorId: vendor.id,
                title: 'Order Cancelled',
                message: `Order #${order.id.slice(0, 8)} has been cancelled by the customer.`,
                type: 'ORDER',
                category: 'ORDER_CANCELLED',
                isRead: true,
                metadata: { orderId: order.id },
                createdAt: createdAt
            }
        });
    }
  }
  console.log(`✅ Seeded ${orderData.length} orders.`);

  // 5. Seed Extra Notifications (Misc/System)
  console.log('🔔 Seeding miscellaneous notifications...');
  const miscNotifications = [
    { title: 'Payout Successful', message: 'Your weekly earnings of ₦45,000 have been disbursed to your bank account.', type: 'PAYOUT', category: 'PAYOUT_PROCESSED', minutesAgo: 720 },
    { title: 'New Review ⭐⭐⭐⭐⭐', message: 'Alice gave you 5 stars: "The Jollof was amazing! Quick service too."', type: 'SYSTEM', category: 'NEW_REVIEW', minutesAgo: 180 },
    { title: 'Store Status Update', message: 'Your store "Asoose Demo Store" is now online and accepting orders.', type: 'SYSTEM', category: 'STORE_STATUS', minutesAgo: 2880 }, // 2 days ago
    { title: 'Holiday Hours', message: 'Remember to update your store hours for the upcoming public holiday.', type: 'SYSTEM', category: 'SYSTEM_ALERT', minutesAgo: 10080 }, // 1 week ago
    { title: 'Inventory Alert', message: 'Classic Jollof Rice is low on stock (less than 5 remaining).', type: 'SYSTEM', category: 'STOCK_ALERT', minutesAgo: 10 },
  ];

  for (const notif of miscNotifications) {
    await prisma.notification.create({
      data: {
        vendorId: vendor.id,
        title: notif.title,
        message: notif.message,
        type: notif.type,
        category: notif.category,
        isRead: notif.minutesAgo > 300, // Older ones are read
        createdAt: new Date(Date.now() - notif.minutesAgo * 60000)
      }
    });
  }
  console.log(`✅ Seeded ${miscNotifications.length} additional notifications.`);

  console.log(`\n🎉 Demo data seeding complete! Ready for screenshots. \n`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
