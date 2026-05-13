import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────

const daysAgo = (n: number, offsetHours = 0) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(d.getHours() - offsetHours);
  return d;
};

const hoursAgo = (n: number) => {
  const d = new Date();
  d.setHours(d.getHours() - n);
  return d;
};

const minutesAgo = (n: number) => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - n);
  return d;
};

const ref = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.floor(Math.random() * 999999)
    .toString()
    .padStart(6, "0")}`;

// ─────────────────────────────────────────────
// CORE ORDER FUNCTION
// ─────────────────────────────────────────────

async function createOrder(opts: any) {
  const orderTotal = opts.items.reduce(
    (s: number, i: any) => s + i.price * i.quantity,
    0
  );

  const commission = orderTotal * (opts.commissionRate / 100);
  const vendorNet = orderTotal - commission;
  const total = orderTotal + opts.deliveryFee;

  const isCompleted = opts.orderStatus === "DELIVERED";
  const isRefunded = opts.paymentStatus === "REFUNDED";

  const group = await prisma.orderGroup.create({
    data: {
      userId: opts.userId,
      totalAmount: total,
      paymentStatus: opts.paymentStatus,
      createdAt: opts.createdAt,
    },
  });

  const order = await prisma.order.create({
    data: {
      userId: opts.userId,
      storeId: opts.storeId,
      orderGroupId: group.id,
      total: orderTotal,
      status: opts.orderStatus,
      paymentStatus:
        opts.paymentStatus === "COMPLETED" ? "PAID" : opts.paymentStatus,
      createdAt: opts.createdAt,
      updatedAt: opts.createdAt,
      deliveredAt: opts.deliveredAt,
      cancelledAt: opts.cancelledAt,
      items: { create: opts.items },
    },
  });

  let paymentId: string | undefined;

  if (opts.paymentStatus !== "PENDING") {
    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        orderGroupId: group.id,
        userId: opts.userId,
        amount: total,
        method: opts.paymentMethod,
        status: opts.paymentStatus,
        reference: ref("PAY"),
        gateway: opts.paymentMethod === "CARD" ? "PAYSTACK" : opts.paymentMethod,
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
      },
    });

    paymentId = payment.id;
  }

  // ───────── TRANSACTIONS ─────────

  if (paymentId) {
    if (isCompleted) {
      await prisma.transaction.create({
        data: {
          type: "PAYMENT_RECEIVED",
          amount: total,
          entityType: "PLATFORM",
          entityId: "platform",
          paymentId,
          orderId: order.id,
          orderGroupId: group.id,
          balanceBefore: 0,
          balanceAfter: total,
          description: "Payment received",
          status: "COMPLETED",
          createdAt: opts.createdAt,
        },
      });

      await prisma.transaction.create({
        data: {
          type: "VENDOR_EARNING",
          amount: vendorNet,
          entityType: "STORE",
          entityId: opts.storeId,
          orderId: order.id,
          orderGroupId: group.id,
          balanceBefore: opts.storeWalletBefore,
          balanceAfter: opts.storeWalletBefore + vendorNet,
          description: "Vendor payout",
          status: "COMPLETED",
          createdAt: opts.createdAt,
        },
      });

      if (opts.riderId) {
        await prisma.transaction.create({
          data: {
            type: "RIDER_EARNING",
            amount: opts.deliveryFee * 0.8,
            entityType: "RIDER",
            entityId: opts.riderId,
            orderId: order.id,
            balanceBefore: opts.riderWalletBefore,
            balanceAfter: opts.riderWalletBefore + opts.deliveryFee * 0.8,
            description: "Rider delivery fee",
            status: "COMPLETED",
            createdAt: opts.createdAt,
          },
        });
      }
    }

    if (isRefunded) {
      await prisma.transaction.create({
        data: {
          type: "REFUND_ISSUED",
          amount: total,
          entityType: "PLATFORM",
          entityId: "platform",
          orderId: order.id,
          orderGroupId: group.id,
          balanceBefore: total,
          balanceAfter: 0,
          description: "Refund processed",
          status: "COMPLETED",
          createdAt: opts.createdAt,
        },
      });
    }
  }

  return { order, group };
}

// ─────────────────────────────────────────────
// SEED FUNCTION
// ─────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database...");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // ───────────────────────── USERS ─────────────────────────

  const chisom = await prisma.user.upsert({
    where: { email: "chisom@seed.dev" },
    update: {},
    create: {
      name: "Chisom Obi",
      email: "chisom@seed.dev",
      phone: "+2348011111111",
      walletBalance: 12000,
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  const seun = await prisma.user.upsert({
    where: { email: "seun@seed.dev" },
    update: {},
    create: {
      name: "Seun Adekunle",
      email: "seun@seed.dev",
      phone: "+2348022222222",
      walletBalance: 6000,
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  const ngozi = await prisma.user.upsert({
    where: { email: "ngozi@seed.dev" },
    update: {},
    create: {
      name: "Ngozi Eze",
      email: "ngozi@seed.dev",
      phone: "+2348033333333",
      walletBalance: 2500,
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  const damilola = await prisma.user.upsert({
    where: { email: "damilola@seed.dev" },
    update: {},
    create: {
      name: "Damilola Bello",
      email: "damilola@seed.dev",
      phone: "+2348044444444",
      walletBalance: 9000,
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  const uche = await prisma.user.upsert({
    where: { email: "uche@seed.dev" },
    update: {},
    create: {
      name: "Uche Nwosu",
      email: "uche@seed.dev",
      phone: "+2348055555555",
      walletBalance: 500,
      password: hashedPassword,
      role: "CUSTOMER",
      status: "ACTIVE",
    },
  });

  // ───────────────────────── STORES ─────────────────────────
  const storeA = await prisma.store.findFirstOrThrow({ where: { slug: "mama-put-lekki" } });
  const storeB = await prisma.store.findFirstOrThrow({ where: { slug: "fresh-mart-vi" } });
  const storeC = await prisma.store.findFirstOrThrow({ where: { slug: "healthplus-ikoyi" } });

  // ───────────────────────── RIDERS ─────────────────────────
  const riderA = await prisma.rider.findFirstOrThrow({ where: { email: "tayo.rider@seed.dev" } });
  const riderB = await prisma.rider.findFirstOrThrow({ where: { email: "felix.rider@seed.dev" } });

  // ───────────────────────── EXTRA STRESS TEST ORDERS ─────────────────────────

  await createOrder({
    userId: chisom.id,
    storeId: storeA.id,
    riderId: riderA.id,
    pickupAddressId: "storeAAddr",
    dropoffAddressId: "chisomHome",
    items: [
      { nameSnap: "Amala", quantity: 1, price: 2500.55, productId: "x" },
      { nameSnap: "Water", quantity: 3, price: 199.99, productId: "y" },
    ],
    deliveryFee: 799.49,
    commissionRate: 10,
    paymentMethod: "CARD",
    orderStatus: "DELIVERED",
    deliveryStatus: "DELIVERED",
    paymentStatus: "COMPLETED",
    createdAt: daysAgo(2),
    deliveredAt: hoursAgo(10),
    storeWalletBefore: 0,
    riderWalletBefore: 0,
  });

  await createOrder({
    userId: seun.id,
    storeId: storeB.id,
    riderId: riderB.id,
    pickupAddressId: "storeBAddr",
    dropoffAddressId: "seunHome",
    items: [
      { nameSnap: "Rice", quantity: 2, price: 5500, productId: "x" },
      { nameSnap: "Oil", quantity: 3, price: 3800, productId: "y" },
    ],
    deliveryFee: 2200,
    commissionRate: 8,
    paymentMethod: "CARD",
    orderStatus: "DELIVERED",
    deliveryStatus: "DELIVERED",
    paymentStatus: "COMPLETED",
    createdAt: daysAgo(4),
    deliveredAt: hoursAgo(6),
    storeWalletBefore: 0,
    riderWalletBefore: 0,
  });

  await createOrder({
    userId: ngozi.id,
    storeId: storeC.id,
    pickupAddressId: "storeCAddr",
    dropoffAddressId: "ngoziHome",
    items: [
      { nameSnap: "Glucometer", quantity: 1, price: 12000, productId: "x" },
    ],
    deliveryFee: 1500,
    commissionRate: 5,
    paymentMethod: "CARD",
    orderStatus: "CANCELLED",
    deliveryStatus: "CANCELLED",
    paymentStatus: "REFUNDED",
    createdAt: daysAgo(6),
    cancelledAt: hoursAgo(2),
    storeWalletBefore: 0,
    riderWalletBefore: 0,
  });

  console.log("✅ Seeding completed");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());