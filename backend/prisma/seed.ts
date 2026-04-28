import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

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

// ─── Reusable: create one full order ─────────────────────────────────────────

async function createOrder(opts: {
  userId: string;
  storeId: string;
  riderId?: string;
  pickupAddressId: string;
  dropoffAddressId: string;
  items: { nameSnap: string; quantity: number; price: number; productId: string }[];
  deliveryFee: number;
  commissionRate: number;
  paymentMethod: "CASH" | "CARD" | "WALLET";
  orderStatus: any;
  deliveryStatus: any;
  paymentStatus: "COMPLETED" | "PENDING" | "REFUNDED" | "FAILED";
  createdAt: Date;
  deliveredAt?: Date;
  cancelledAt?: Date;
  storeWalletBefore: number;
  riderWalletBefore: number;
  includeTransactions?: boolean;
}) {
  const orderTotal = opts.items.reduce((s, i) => s + i.price * i.quantity, 0);
  const commission = orderTotal * (opts.commissionRate / 100);
  const vendorNet = orderTotal - commission;
  const total = orderTotal + opts.deliveryFee;
  const isCompleted = opts.orderStatus === "DELIVERED";
  const isCancelled = opts.orderStatus === "CANCELLED" || opts.orderStatus === "REJECTED";
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
      paymentStatus: opts.paymentStatus === "COMPLETED" ? "PAID" : opts.paymentStatus,
      createdAt: opts.createdAt,
      updatedAt: opts.createdAt,
      deliveredAt: opts.deliveredAt,
      cancelledAt: opts.cancelledAt,
      items: { create: opts.items },
    },
  });

  let paymentId: string | undefined;
  if (opts.paymentStatus !== "PENDING") {
    const gateway =
      opts.paymentMethod === "CASH"
        ? "CASH"
        : opts.paymentMethod === "WALLET"
        ? "WALLET"
        : "PAYSTACK";

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        orderGroupId: group.id,
        userId: opts.userId,
        amount: total,
        method: opts.paymentMethod,
        status: opts.paymentStatus,
        reference: ref(gateway),
        gateway,
        transactionId: opts.paymentMethod === "CARD" ? `TXN${Date.now()}` : undefined,
        paidAt: opts.paymentStatus === "COMPLETED" ? opts.createdAt : undefined,
        verifiedAt: opts.paymentStatus === "COMPLETED" ? opts.createdAt : undefined,
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
      },
    });
    paymentId = payment.id;

    await prisma.orderGroup.update({
      where: { id: group.id },
      data: { payment: { connect: { id: payment.id } } },
    });
  }

  // Delivery
  let deliveryId: string | undefined;
  if (!isCancelled || opts.deliveryStatus !== "CANCELLED") {
    const delivery = await prisma.delivery.create({
      data: {
        orderId: order.id,
        customerId: opts.userId,
        riderId: opts.riderId,
        pickupAddressId: opts.pickupAddressId,
        dropoffAddressId: opts.dropoffAddressId,
        status: opts.deliveryStatus,
        recipientName: "Customer",
        recipientPhone: "+2348000000000",
        deliveryFee: opts.deliveryFee,
        distanceKm: parseFloat((Math.random() * 8 + 1).toFixed(1)),
        orderGroupId: group.id,
        assignedAt: opts.riderId ? opts.createdAt : undefined,
        pickedUpAt: isCompleted ? opts.createdAt : undefined,
        deliveredAt: opts.deliveredAt,
        createdAt: opts.createdAt,
        updatedAt: opts.createdAt,
      },
    });
    deliveryId = delivery.id;
  }

  // Transactions
  if ((opts.includeTransactions ?? true) && paymentId) {
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
          description: `${opts.paymentMethod} payment for order`,
          status: "COMPLETED",
          createdAt: opts.createdAt,
        },
      });

      await prisma.transaction.create({
        data: {
          type: "COMMISSION_DEDUCTED",
          amount: commission,
          entityType: "STORE",
          entityId: opts.storeId,
          orderId: order.id,
          orderGroupId: group.id,
          balanceBefore: opts.storeWalletBefore,
          balanceAfter: opts.storeWalletBefore,
          description: `${opts.commissionRate}% platform commission`,
          metadata: { commissionRate: opts.commissionRate },
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
          description: `Net earning after ${opts.commissionRate}% commission`,
          status: "COMPLETED",
          createdAt: opts.createdAt,
        },
      });

      if (opts.riderId && deliveryId) {
        await prisma.transaction.create({
          data: {
            type: "RIDER_EARNING",
            amount: opts.deliveryFee * 0.8,
            entityType: "RIDER",
            entityId: opts.riderId,
            deliveryId,
            orderId: order.id,
            balanceBefore: opts.riderWalletBefore,
            balanceAfter: opts.riderWalletBefore + opts.deliveryFee * 0.8,
            description: "Rider delivery fee (80%)",
            status: "COMPLETED",
            createdAt: opts.createdAt,
          },
        });
      }

      await prisma.store.update({
        where: { id: opts.storeId },
        data: {
          walletBalance: { increment: vendorNet },
          totalRevenue: { increment: orderTotal },
          totalOrders: { increment: 1 },
        },
      });

      if (opts.riderId) {
        await prisma.rider.update({
          where: { id: opts.riderId },
          data: { walletBalance: { increment: opts.deliveryFee * 0.8 } },
        });
      }
    }

    if (isRefunded) {
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
          description: "Payment for later-cancelled order",
          status: "REVERSED",
          createdAt: opts.createdAt,
        },
      });
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
          description: "Full refund issued to customer",
          metadata: { method: opts.paymentMethod },
          status: "COMPLETED",
          createdAt: opts.createdAt,
        },
      });
    }
  }

  return { order, group };
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding store orders …\n");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // ══════════════════════════════════════════════════════════════════════════
  //  INFRASTRUCTURE
  // ══════════════════════════════════════════════════════════════════════════

  const city = await prisma.city.upsert({
    where: { name: "Lagos" },
    update: {},
    create: { name: "Lagos", state: "Lagos", isActive: true },
  });

  // ── 5 Customers ──────────────────────────────────────────────────────────
  const customers = await Promise.all(
    [
      { name: "Chisom Obi",      email: "chisom@seed.dev",   phone: "+2348011111111", walletBalance: 12000 },
      { name: "Seun Adekunle",   email: "seun@seed.dev",     phone: "+2348022222222", walletBalance: 6000  },
      { name: "Ngozi Eze",       email: "ngozi@seed.dev",    phone: "+2348033333333", walletBalance: 2500  },
      { name: "Damilola Bello",  email: "damilola@seed.dev", phone: "+2348044444444", walletBalance: 9000  },
      { name: "Uche Nwosu",      email: "uche@seed.dev",     phone: "+2348055555555", walletBalance: 500   },
    ].map(({ name, email, phone, walletBalance }) =>
      prisma.user.upsert({
        where: { email },
        update: {},
        create: { name, email, phone, walletBalance, password: hashedPassword, role: "CUSTOMER", status: "ACTIVE" },
      })
    )
  );
  const [chisom, seun, ngozi, damilola, uche] = customers;

  // ── 3 Vendors + Stores ────────────────────────────────────────────────────

  // Store A — Restaurant
  const vendorA = await prisma.vendor.upsert({
    where: { email: "mama-put@seed.dev" },
    update: {},
    create: {
      email: "mama-put@seed.dev",
      password: hashedPassword,
      name: "Mama Put Ventures",
      phone: "+2348066666666",
      countryCode: "+234",
      businessType: "RESTAURANT",
      employees: "10-50",
      status: "ACTIVE",
    },
  });

  const storeA = await prisma.store.upsert({
    where: { slug: "mama-put-lekki" },
    update: {},
    create: {
      name: "Mama Put Lekki",
      slug: "mama-put-lekki",
      description: "Lagos street food done right",
      type: "RESTAURANT",
      address: "12 Admiralty Way, Lekki Phase 1",
      lat: 6.4317,
      lng: 3.4686,
      status: "ACTIVE",
      verification: "VERIFIED",
      commissionRate: 10,
      prepTime: 15,
      isOpen: true,
      walletBalance: 0,
      totalOrders: 0,
      totalRevenue: 0,
      vendorId: vendorA.id,
      cityId: city.id,
    },
  });

  // Store B — Grocery
  const vendorB = await prisma.vendor.upsert({
    where: { email: "fresh-mart@seed.dev" },
    update: {},
    create: {
      email: "fresh-mart@seed.dev",
      password: hashedPassword,
      name: "Fresh Mart Ltd",
      phone: "+2348077777777",
      countryCode: "+234",
      businessType: "GROCERY",
      employees: "20-100",
      status: "ACTIVE",
    },
  });

  const storeB = await prisma.store.upsert({
    where: { slug: "fresh-mart-vi" },
    update: {},
    create: {
      name: "Fresh Mart VI",
      slug: "fresh-mart-vi",
      description: "Fresh produce & daily essentials",
      type: "GROCERY",
      address: "15 Ozumba Mbadiwe, Victoria Island",
      lat: 6.4281,
      lng: 3.4219,
      status: "ACTIVE",
      verification: "VERIFIED",
      commissionRate: 8,
      prepTime: 10,
      isOpen: true,
      walletBalance: 0,
      totalOrders: 0,
      totalRevenue: 0,
      vendorId: vendorB.id,
      cityId: city.id,
    },
  });

  // Store C — Pharmacy
  const vendorC = await prisma.vendor.upsert({
    where: { email: "healthplus@seed.dev" },
    update: {},
    create: {
      email: "healthplus@seed.dev",
      password: hashedPassword,
      name: "HealthPlus Pharma",
      phone: "+2348088888888",
      countryCode: "+234",
      businessType: "PHARMACY",
      employees: "5-20",
      status: "ACTIVE",
    },
  });

  const storeC = await prisma.store.upsert({
    where: { slug: "healthplus-ikoyi" },
    update: {},
    create: {
      name: "HealthPlus Ikoyi",
      slug: "healthplus-ikoyi",
      description: "Medications & health products",
      type: "PHARMACY",
      address: "3 Bourdillon Road, Ikoyi",
      lat: 6.4536,
      lng: 3.4378,
      status: "ACTIVE",
      verification: "VERIFIED",
      commissionRate: 5,
      prepTime: 5,
      isOpen: true,
      walletBalance: 0,
      totalOrders: 0,
      totalRevenue: 0,
      vendorId: vendorC.id,
      cityId: city.id,
    },
  });

  // ── 2 Riders ─────────────────────────────────────────────────────────────
  const riderA = await prisma.rider.upsert({
    where: { email: "tayo.rider@seed.dev" },
    update: {},
    create: {
      email: "tayo.rider@seed.dev",
      password: hashedPassword,
      name: "Tayo Alabi",
      phone: "+2347011111111",
      countryCode: "+234",
      role: "RIDER",
      status: "ACTIVE",
      isOnline: true,
      walletBalance: 0,
      commissionRate: 20,
      rating: 4.8,
      totalRides: 0,
      cityId: city.id,
      currentLat: 6.435,
      currentLng: 3.465,
    },
  });

  const riderB = await prisma.rider.upsert({
    where: { email: "felix.rider@seed.dev" },
    update: {},
    create: {
      email: "felix.rider@seed.dev",
      password: hashedPassword,
      name: "Felix Okafor",
      phone: "+2347022222222",
      countryCode: "+234",
      role: "RIDER",
      status: "ACTIVE",
      isOnline: true,
      walletBalance: 0,
      commissionRate: 20,
      rating: 4.6,
      totalRides: 0,
      cityId: city.id,
      currentLat: 6.428,
      currentLng: 3.422,
    },
  });

  // ── Categories & Products ─────────────────────────────────────────────────
  const catFood = await prisma.category.upsert({
    where: { slug: "street-food" },
    update: {},
    create: { name: "Street Food", slug: "street-food" },
  });

  const catGrocery = await prisma.category.upsert({
    where: { slug: "groceries" },
    update: {},
    create: { name: "Groceries", slug: "groceries" },
  });

  const catPharma = await prisma.category.upsert({
    where: { slug: "pharmacy" },
    update: {},
    create: { name: "Pharmacy", slug: "pharmacy" },
  });

  // Store A products
  const boli          = await prisma.product.upsert({ where: { slug: "boli-mpl" },           update: {}, create: { name: "Boli & Fish",             slug: "boli-mpl",           price: 1200, status: "ACTIVE", stock: 100, manageStock: false, storeId: storeA.id, categoryId: catFood.id } });
  const amala         = await prisma.product.upsert({ where: { slug: "amala-mpl" },          update: {}, create: { name: "Amala & Ewedu",            slug: "amala-mpl",          price: 2500, status: "ACTIVE", stock: 80,  manageStock: false, storeId: storeA.id, categoryId: catFood.id } });
  const moinmoin      = await prisma.product.upsert({ where: { slug: "moinmoin-mpl" },       update: {}, create: { name: "Moin Moin (6 wraps)",      slug: "moinmoin-mpl",       price: 1800, status: "ACTIVE", stock: 60,  manageStock: false, storeId: storeA.id, categoryId: catFood.id } });
  const akaraEgg      = await prisma.product.upsert({ where: { slug: "akara-egg-mpl" },      update: {}, create: { name: "Akara & Boiled Egg",       slug: "akara-egg-mpl",      price: 900,  status: "ACTIVE", stock: 120, manageStock: false, storeId: storeA.id, categoryId: catFood.id } });
  const ofeOnugbu     = await prisma.product.upsert({ where: { slug: "ofe-onugbu-mpl" },     update: {}, create: { name: "Ofe Onugbu + Eba",         slug: "ofe-onugbu-mpl",     price: 3000, status: "ACTIVE", stock: 40,  manageStock: false, storeId: storeA.id, categoryId: catFood.id } });
  const nkwobi        = await prisma.product.upsert({ where: { slug: "nkwobi-mpl" },         update: {}, create: { name: "Nkwobi (500g)",            slug: "nkwobi-mpl",         price: 4500, status: "ACTIVE", stock: 30,  manageStock: false, storeId: storeA.id, categoryId: catFood.id } });
  const drinkWater    = await prisma.product.upsert({ where: { slug: "water-bottle-mpl" },   update: {}, create: { name: "Table Water (50cl)",       slug: "water-bottle-mpl",   price: 200,  status: "ACTIVE", stock: 500, manageStock: false, storeId: storeA.id, categoryId: catFood.id } });

  // Store B products
  const rice5kg       = await prisma.product.upsert({ where: { slug: "rice-5kg-fm" },        update: {}, create: { name: "Rice (5kg bag)",           slug: "rice-5kg-fm",        price: 5500, status: "ACTIVE", stock: 200, manageStock: false, storeId: storeB.id, categoryId: catGrocery.id } });
  const tomato        = await prisma.product.upsert({ where: { slug: "tomato-1kg-fm" },      update: {}, create: { name: "Fresh Tomatoes (1kg)",     slug: "tomato-1kg-fm",      price: 1200, status: "ACTIVE", stock: 300, manageStock: false, storeId: storeB.id, categoryId: catGrocery.id } });
  const cookingOil    = await prisma.product.upsert({ where: { slug: "oil-2l-fm" },          update: {}, create: { name: "Vegetable Oil (2L)",       slug: "oil-2l-fm",          price: 3800, status: "ACTIVE", stock: 150, manageStock: false, storeId: storeB.id, categoryId: catGrocery.id } });
  const eggs12        = await prisma.product.upsert({ where: { slug: "eggs-12-fm" },         update: {}, create: { name: "Eggs (crate of 12)",       slug: "eggs-12-fm",         price: 1800, status: "ACTIVE", stock: 100, manageStock: false, storeId: storeB.id, categoryId: catGrocery.id } });
  const indomie       = await prisma.product.upsert({ where: { slug: "indomie-pack-fm" },    update: {}, create: { name: "Indomie Noodles (40 pack)","slug": "indomie-pack-fm",  price: 4200, status: "ACTIVE", stock: 180, manageStock: false, storeId: storeB.id, categoryId: catGrocery.id } });
  const garri         = await prisma.product.upsert({ where: { slug: "garri-2kg-fm" },       update: {}, create: { name: "Garri (2kg)",              slug: "garri-2kg-fm",       price: 1500, status: "ACTIVE", stock: 250, manageStock: false, storeId: storeB.id, categoryId: catGrocery.id } });

  // Store C products
  const paracetamol   = await prisma.product.upsert({ where: { slug: "paracetamol-hp" },     update: {}, create: { name: "Paracetamol (Strip)",      slug: "paracetamol-hp",     price: 350,  status: "ACTIVE", stock: 500, manageStock: false, storeId: storeC.id, categoryId: catPharma.id } });
  const ibuprofen     = await prisma.product.upsert({ where: { slug: "ibuprofen-hp" },       update: {}, create: { name: "Ibuprofen 400mg",          slug: "ibuprofen-hp",       price: 450,  status: "ACTIVE", stock: 400, manageStock: false, storeId: storeC.id, categoryId: catPharma.id } });
  const vitaminC      = await prisma.product.upsert({ where: { slug: "vitaminc-hp" },        update: {}, create: { name: "Vitamin C 1000mg (30s)",   slug: "vitaminc-hp",        price: 3200, status: "ACTIVE", stock: 200, manageStock: false, storeId: storeC.id, categoryId: catPharma.id } });
  const handSanitizer = await prisma.product.upsert({ where: { slug: "sanitizer-hp" },      update: {}, create: { name: "Hand Sanitizer (500ml)",   slug: "sanitizer-hp",       price: 1800, status: "ACTIVE", stock: 300, manageStock: false, storeId: storeC.id, categoryId: catPharma.id } });
  const glucometer    = await prisma.product.upsert({ where: { slug: "glucometer-hp" },      update: {}, create: { name: "Glucometer Kit",           slug: "glucometer-hp",      price: 12000, status: "ACTIVE", stock: 50, manageStock: false, storeId: storeC.id, categoryId: catPharma.id } });

  // ── Customer delivery addresses ───────────────────────────────────────────
  const makeAddr = (userId: string, label: string, street: string, lat: number, lng: number) =>
    prisma.address.create({ data: { userId, label, street, city: "Lagos", state: "Lagos", lat, lng, isDefault: label === "Home" } });

  const chisomHome   = await makeAddr(chisom.id,   "Home",   "4 Awolowo Rd, Ikoyi",         6.4499, 3.4312);
  const seunHome     = await makeAddr(seun.id,     "Home",   "22 Allen Ave, Ikeja",          6.6018, 3.3515);
  const ngoziHome    = await makeAddr(ngozi.id,    "Home",   "10 Bode Thomas, Surulere",     6.5012, 3.3607);
  const damilolaHome = await makeAddr(damilola.id, "Home",   "7 Lekki-Epe Expy, Ajah",      6.4698, 3.5712);
  const ucheHome     = await makeAddr(uche.id,     "Home",   "5 Broad St, Lagos Island",     6.4541, 3.3947);
  const chisomWork   = await makeAddr(chisom.id,   "Office", "1415 Idejo St, Victoria Island", 6.4323, 3.4215);

  // ── Store pickup addresses ────────────────────────────────────────────────
  const storeAAddr = await prisma.address.create({ data: { vendorId: vendorA.id, label: "Pickup", street: "12 Admiralty Way, Lekki Phase 1", city: "Lagos", state: "Lagos", lat: 6.4317, lng: 3.4686, isDefault: true } });
  const storeBAddr = await prisma.address.create({ data: { vendorId: vendorB.id, label: "Pickup", street: "15 Ozumba Mbadiwe, Victoria Island", city: "Lagos", state: "Lagos", lat: 6.4281, lng: 3.4219, isDefault: true } });
  const storeCAddr = await prisma.address.create({ data: { vendorId: vendorC.id, label: "Pickup", street: "3 Bourdillon Road, Ikoyi", city: "Lagos", state: "Lagos", lat: 6.4536, lng: 3.4378, isDefault: true } });

  console.log("  ✓ Infrastructure ready (3 stores · 5 customers · 2 riders)\n");

  // ══════════════════════════════════════════════════════════════════════════
  //  STORE A — MAMA PUT LEKKI (restaurant)  23 orders
  // ══════════════════════════════════════════════════════════════════════════

  console.log("  🍽️  Store A — Mama Put Lekki");

  const storeAOrders: { label: string; opts: Parameters<typeof createOrder>[0] }[] = [];

  const getStoreWallet = async (id: string) =>
    prisma.store.findUnique({ where: { id } }).then((s) => s!.walletBalance);
  const getRiderWallet = async (id: string) =>
    prisma.rider.findUnique({ where: { id } }).then((r) => r!.walletBalance);

  // === DELIVERED orders (14 total) ===
  const deliveredConfigsA = [
    { days: 30, customer: chisom,   dropAddr: chisomHome,   rider: riderA, items: [{ nameSnap: amala.name,     quantity: 2, price: amala.price,     productId: amala.id },     { nameSnap: drinkWater.name, quantity: 2, price: drinkWater.price, productId: drinkWater.id }], fee: 800,  method: "CASH"   as const },
    { days: 28, customer: seun,     dropAddr: seunHome,     rider: riderB, items: [{ nameSnap: moinmoin.name,  quantity: 1, price: moinmoin.price,  productId: moinmoin.id },  { nameSnap: boli.name,       quantity: 1, price: boli.price,       productId: boli.id }],       fee: 1000, method: "CARD"   as const },
    { days: 25, customer: ngozi,    dropAddr: ngoziHome,    rider: riderA, items: [{ nameSnap: ofeOnugbu.name, quantity: 1, price: ofeOnugbu.price, productId: ofeOnugbu.id }],                                                                                                 fee: 700,  method: "WALLET" as const },
    { days: 21, customer: damilola, dropAddr: damilolaHome, rider: riderA, items: [{ nameSnap: nkwobi.name,    quantity: 1, price: nkwobi.price,    productId: nkwobi.id },    { nameSnap: amala.name,      quantity: 1, price: amala.price,      productId: amala.id }],       fee: 1200, method: "CARD"   as const },
    { days: 20, customer: chisom,   dropAddr: chisomWork,   rider: riderB, items: [{ nameSnap: akaraEgg.name,  quantity: 3, price: akaraEgg.price,  productId: akaraEgg.id }],                                                                                                 fee: 600,  method: "CASH"   as const },
    { days: 18, customer: uche,     dropAddr: ucheHome,     rider: riderA, items: [{ nameSnap: boli.name,      quantity: 2, price: boli.price,      productId: boli.id },      { nameSnap: drinkWater.name, quantity: 4, price: drinkWater.price, productId: drinkWater.id }], fee: 500,  method: "CARD"   as const },
    { days: 15, customer: seun,     dropAddr: seunHome,     rider: riderB, items: [{ nameSnap: amala.name,     quantity: 1, price: amala.price,     productId: amala.id },     { nameSnap: moinmoin.name,   quantity: 1, price: moinmoin.price,   productId: moinmoin.id }],   fee: 900,  method: "WALLET" as const },
    { days: 14, customer: ngozi,    dropAddr: ngoziHome,    rider: riderA, items: [{ nameSnap: nkwobi.name,    quantity: 1, price: nkwobi.price,    productId: nkwobi.id }],                                                                                                    fee: 700,  method: "CARD"   as const },
    { days: 12, customer: damilola, dropAddr: damilolaHome, rider: riderB, items: [{ nameSnap: ofeOnugbu.name, quantity: 2, price: ofeOnugbu.price, productId: ofeOnugbu.id }, { nameSnap: drinkWater.name, quantity: 2, price: drinkWater.price, productId: drinkWater.id }], fee: 1100, method: "CASH"   as const },
    { days: 10, customer: chisom,   dropAddr: chisomHome,   rider: riderA, items: [{ nameSnap: moinmoin.name,  quantity: 2, price: moinmoin.price,  productId: moinmoin.id },  { nameSnap: akaraEgg.name,   quantity: 2, price: akaraEgg.price,   productId: akaraEgg.id }],   fee: 800,  method: "CARD"   as const },
    { days: 8,  customer: uche,     dropAddr: ucheHome,     rider: riderB, items: [{ nameSnap: amala.name,     quantity: 1, price: amala.price,     productId: amala.id }],                                                                                                     fee: 500,  method: "CASH"   as const },
    { days: 6,  customer: seun,     dropAddr: seunHome,     rider: riderA, items: [{ nameSnap: boli.name,      quantity: 3, price: boli.price,      productId: boli.id },      { nameSnap: drinkWater.name, quantity: 6, price: drinkWater.price, productId: drinkWater.id }], fee: 1000, method: "CARD"   as const },
    { days: 4,  customer: ngozi,    dropAddr: ngoziHome,    rider: riderB, items: [{ nameSnap: nkwobi.name,    quantity: 1, price: nkwobi.price,    productId: nkwobi.id },    { nameSnap: amala.name,      quantity: 1, price: amala.price,      productId: amala.id }],       fee: 700,  method: "WALLET" as const },
    { days: 2,  customer: damilola, dropAddr: damilolaHome, rider: riderA, items: [{ nameSnap: ofeOnugbu.name, quantity: 1, price: ofeOnugbu.price, productId: ofeOnugbu.id }, { nameSnap: moinmoin.name,   quantity: 1, price: moinmoin.price,   productId: moinmoin.id }],   fee: 900,  method: "CARD"   as const },
  ];

  for (const cfg of deliveredConfigsA) {
    const sw = await getStoreWallet(storeA.id);
    const rw = await getRiderWallet(cfg.rider.id);
    const { order } = await createOrder({
      userId: cfg.customer.id,
      storeId: storeA.id,
      riderId: cfg.rider.id,
      pickupAddressId: storeAAddr.id,
      dropoffAddressId: cfg.dropAddr.id,
      items: cfg.items,
      deliveryFee: cfg.fee,
      commissionRate: storeA.commissionRate,
      paymentMethod: cfg.method,
      orderStatus: "DELIVERED",
      deliveryStatus: "DELIVERED",
      paymentStatus: "COMPLETED",
      createdAt: daysAgo(cfg.days),
      deliveredAt: daysAgo(cfg.days, -2),
      storeWalletBefore: sw,
      riderWalletBefore: rw,
    });
    process.stdout.write(".");
  }

  // === CANCELLED + refunded (3) ===
  for (const cfg of [
    { days: 26, customer: chisom,   items: [{ nameSnap: nkwobi.name,   quantity: 1, price: nkwobi.price,   productId: nkwobi.id }],   fee: 800,  method: "CARD"   as const },
    { days: 11, customer: uche,     items: [{ nameSnap: amala.name,    quantity: 2, price: amala.price,    productId: amala.id }],    fee: 600,  method: "WALLET" as const },
    { days: 3,  customer: seun,     items: [{ nameSnap: ofeOnugbu.name,quantity: 1, price: ofeOnugbu.price,productId: ofeOnugbu.id }], fee: 700,  method: "CARD"   as const },
  ]) {
    const sw = await getStoreWallet(storeA.id);
    await createOrder({
      userId: cfg.customer.id,
      storeId: storeA.id,
      pickupAddressId: storeAAddr.id,
      dropoffAddressId: chisomHome.id,
      items: cfg.items,
      deliveryFee: cfg.fee,
      commissionRate: storeA.commissionRate,
      paymentMethod: cfg.method,
      orderStatus: "CANCELLED",
      deliveryStatus: "CANCELLED",
      paymentStatus: "REFUNDED",
      createdAt: daysAgo(cfg.days),
      cancelledAt: daysAgo(cfg.days, -1),
      storeWalletBefore: sw,
      riderWalletBefore: 0,
    });
    process.stdout.write(".");
  }

  // === REJECTED by store (2) ===
  for (const cfg of [
    { days: 17, customer: ngozi,    items: [{ nameSnap: moinmoin.name,  quantity: 3, price: moinmoin.price,  productId: moinmoin.id }],  fee: 700, method: "CASH" as const },
    { days: 5,  customer: damilola, items: [{ nameSnap: akaraEgg.name,  quantity: 5, price: akaraEgg.price,  productId: akaraEgg.id }],  fee: 600, method: "CARD" as const },
  ]) {
    const sw = await getStoreWallet(storeA.id);
    await createOrder({
      userId: cfg.customer.id,
      storeId: storeA.id,
      pickupAddressId: storeAAddr.id,
      dropoffAddressId: ngoziHome.id,
      items: cfg.items,
      deliveryFee: cfg.fee,
      commissionRate: storeA.commissionRate,
      paymentMethod: cfg.method,
      orderStatus: "REJECTED",
      deliveryStatus: "CANCELLED",
      paymentStatus: "REFUNDED",
      createdAt: daysAgo(cfg.days),
      cancelledAt: daysAgo(cfg.days, -1),
      storeWalletBefore: sw,
      riderWalletBefore: 0,
    });
    process.stdout.write(".");
  }

  // === ACTIVE orders (live right now) ===
  // Confirmed — 45 min ago
  {
    const sw = await getStoreWallet(storeA.id);
    await createOrder({
      userId: chisom.id, storeId: storeA.id, riderId: riderA.id,
      pickupAddressId: storeAAddr.id, dropoffAddressId: chisomWork.id,
      items: [{ nameSnap: amala.name, quantity: 2, price: amala.price, productId: amala.id }, { nameSnap: drinkWater.name, quantity: 2, price: drinkWater.price, productId: drinkWater.id }],
      deliveryFee: 800, commissionRate: storeA.commissionRate, paymentMethod: "WALLET",
      orderStatus: "CONFIRMED", deliveryStatus: "ASSIGNED",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(45),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  // Preparing — 20 min ago
  {
    const sw = await getStoreWallet(storeA.id);
    await createOrder({
      userId: seun.id, storeId: storeA.id,
      pickupAddressId: storeAAddr.id, dropoffAddressId: seunHome.id,
      items: [{ nameSnap: boli.name, quantity: 2, price: boli.price, productId: boli.id }],
      deliveryFee: 1000, commissionRate: storeA.commissionRate, paymentMethod: "CARD",
      orderStatus: "PREPARING", deliveryStatus: "PENDING",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(20),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  // Ready (waiting for rider pickup) — 10 min ago
  {
    const sw = await getStoreWallet(storeA.id);
    await createOrder({
      userId: ngozi.id, storeId: storeA.id, riderId: riderB.id,
      pickupAddressId: storeAAddr.id, dropoffAddressId: ngoziHome.id,
      items: [{ nameSnap: nkwobi.name, quantity: 1, price: nkwobi.price, productId: nkwobi.id }],
      deliveryFee: 700, commissionRate: storeA.commissionRate, paymentMethod: "CASH",
      orderStatus: "READY", deliveryStatus: "ASSIGNED",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(10),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  // Dispatched — rider on the way
  {
    const sw = await getStoreWallet(storeA.id);
    await createOrder({
      userId: damilola.id, storeId: storeA.id, riderId: riderA.id,
      pickupAddressId: storeAAddr.id, dropoffAddressId: damilolaHome.id,
      items: [{ nameSnap: ofeOnugbu.name, quantity: 1, price: ofeOnugbu.price, productId: ofeOnugbu.id }, { nameSnap: moinmoin.name, quantity: 1, price: moinmoin.price, productId: moinmoin.id }],
      deliveryFee: 1200, commissionRate: storeA.commissionRate, paymentMethod: "CARD",
      orderStatus: "DISPATCHED", deliveryStatus: "IN_TRANSIT",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(35),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  console.log(`\n    ✓ Store A done (${deliveredConfigsA.length + 3 + 2 + 4} orders)`);

  // ══════════════════════════════════════════════════════════════════════════
  //  STORE B — FRESH MART VI (grocery)  18 orders
  // ══════════════════════════════════════════════════════════════════════════

  console.log("  🛒  Store B — Fresh Mart VI");

  // Delivered (11)
  const deliveredConfigsB = [
    { days: 29, customer: damilola, dropAddr: damilolaHome, rider: riderB, items: [{ nameSnap: rice5kg.name,    quantity: 2, price: rice5kg.price,    productId: rice5kg.id },    { nameSnap: cookingOil.name, quantity: 1, price: cookingOil.price, productId: cookingOil.id }], fee: 1200, method: "CARD"   as const },
    { days: 24, customer: chisom,   dropAddr: chisomHome,   rider: riderA, items: [{ nameSnap: eggs12.name,     quantity: 2, price: eggs12.price,     productId: eggs12.id },     { nameSnap: tomato.name,     quantity: 3, price: tomato.price,     productId: tomato.id }],     fee: 900,  method: "WALLET" as const },
    { days: 22, customer: seun,     dropAddr: seunHome,     rider: riderB, items: [{ nameSnap: indomie.name,    quantity: 1, price: indomie.price,    productId: indomie.id },    { nameSnap: garri.name,      quantity: 1, price: garri.price,      productId: garri.id }],      fee: 800,  method: "CASH"   as const },
    { days: 19, customer: uche,     dropAddr: ucheHome,     rider: riderA, items: [{ nameSnap: rice5kg.name,    quantity: 1, price: rice5kg.price,    productId: rice5kg.id }],                                                                                                    fee: 700,  method: "CARD"   as const },
    { days: 16, customer: ngozi,    dropAddr: ngoziHome,    rider: riderB, items: [{ nameSnap: tomato.name,     quantity: 5, price: tomato.price,     productId: tomato.id },     { nameSnap: cookingOil.name, quantity: 1, price: cookingOil.price, productId: cookingOil.id }], fee: 1000, method: "CARD"   as const },
    { days: 13, customer: damilola, dropAddr: damilolaHome, rider: riderA, items: [{ nameSnap: eggs12.name,     quantity: 3, price: eggs12.price,     productId: eggs12.id }],                                                                                                     fee: 600,  method: "WALLET" as const },
    { days: 11, customer: chisom,   dropAddr: chisomWork,   rider: riderB, items: [{ nameSnap: garri.name,      quantity: 2, price: garri.price,      productId: garri.id },      { nameSnap: indomie.name,    quantity: 1, price: indomie.price,    productId: indomie.id }],    fee: 750,  method: "CASH"   as const },
    { days: 9,  customer: seun,     dropAddr: seunHome,     rider: riderA, items: [{ nameSnap: rice5kg.name,    quantity: 2, price: rice5kg.price,    productId: rice5kg.id },    { nameSnap: tomato.name,     quantity: 2, price: tomato.price,     productId: tomato.id }],     fee: 1100, method: "CARD"   as const },
    { days: 7,  customer: uche,     dropAddr: ucheHome,     rider: riderB, items: [{ nameSnap: cookingOil.name, quantity: 2, price: cookingOil.price, productId: cookingOil.id }],                                                                                                 fee: 800,  method: "CARD"   as const },
    { days: 5,  customer: ngozi,    dropAddr: ngoziHome,    rider: riderA, items: [{ nameSnap: indomie.name,    quantity: 2, price: indomie.price,    productId: indomie.id },    { nameSnap: eggs12.name,     quantity: 1, price: eggs12.price,     productId: eggs12.id }],     fee: 900,  method: "WALLET" as const },
    { days: 1,  customer: damilola, dropAddr: damilolaHome, rider: riderB, items: [{ nameSnap: rice5kg.name,    quantity: 1, price: rice5kg.price,    productId: rice5kg.id },    { nameSnap: garri.name,      quantity: 1, price: garri.price,      productId: garri.id },      { nameSnap: tomato.name, quantity: 2, price: tomato.price, productId: tomato.id }], fee: 1000, method: "CARD" as const },
  ];

  for (const cfg of deliveredConfigsB) {
    const sw = await getStoreWallet(storeB.id);
    const rw = await getRiderWallet(cfg.rider.id);
    await createOrder({
      userId: cfg.customer.id, storeId: storeB.id, riderId: cfg.rider.id,
      pickupAddressId: storeBAddr.id, dropoffAddressId: cfg.dropAddr.id,
      items: cfg.items, deliveryFee: cfg.fee, commissionRate: storeB.commissionRate,
      paymentMethod: cfg.method, orderStatus: "DELIVERED", deliveryStatus: "DELIVERED",
      paymentStatus: "COMPLETED", createdAt: daysAgo(cfg.days), deliveredAt: daysAgo(cfg.days, -3),
      storeWalletBefore: sw, riderWalletBefore: rw,
    });
    process.stdout.write(".");
  }

  // Cancelled (2)
  for (const cfg of [
    { days: 23, customer: chisom,   items: [{ nameSnap: rice5kg.name, quantity: 2, price: rice5kg.price, productId: rice5kg.id }],     fee: 900,  method: "CARD"   as const },
    { days: 8,  customer: uche,     items: [{ nameSnap: indomie.name, quantity: 1, price: indomie.price, productId: indomie.id }],     fee: 700,  method: "WALLET" as const },
  ]) {
    const sw = await getStoreWallet(storeB.id);
    await createOrder({
      userId: cfg.customer.id, storeId: storeB.id,
      pickupAddressId: storeBAddr.id, dropoffAddressId: ucheHome.id,
      items: cfg.items, deliveryFee: cfg.fee, commissionRate: storeB.commissionRate,
      paymentMethod: cfg.method, orderStatus: "CANCELLED", deliveryStatus: "CANCELLED",
      paymentStatus: "REFUNDED", createdAt: daysAgo(cfg.days), cancelledAt: daysAgo(cfg.days, -1),
      storeWalletBefore: sw, riderWalletBefore: 0,
    });
    process.stdout.write(".");
  }

  // Active — Pending (just placed)
  {
    const sw = await getStoreWallet(storeB.id);
    await createOrder({
      userId: chisom.id, storeId: storeB.id,
      pickupAddressId: storeBAddr.id, dropoffAddressId: chisomHome.id,
      items: [{ nameSnap: eggs12.name, quantity: 2, price: eggs12.price, productId: eggs12.id }, { nameSnap: tomato.name, quantity: 3, price: tomato.price, productId: tomato.id }],
      deliveryFee: 850, commissionRate: storeB.commissionRate, paymentMethod: "CARD",
      orderStatus: "PENDING", deliveryStatus: "PENDING",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(5),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  // Active — Confirmed
  {
    const sw = await getStoreWallet(storeB.id);
    await createOrder({
      userId: seun.id, storeId: storeB.id, riderId: riderA.id,
      pickupAddressId: storeBAddr.id, dropoffAddressId: seunHome.id,
      items: [{ nameSnap: rice5kg.name, quantity: 1, price: rice5kg.price, productId: rice5kg.id }, { nameSnap: cookingOil.name, quantity: 1, price: cookingOil.price, productId: cookingOil.id }],
      deliveryFee: 1200, commissionRate: storeB.commissionRate, paymentMethod: "WALLET",
      orderStatus: "CONFIRMED", deliveryStatus: "ASSIGNED",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(15),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  // Active — Dispatched
  {
    const sw = await getStoreWallet(storeB.id);
    await createOrder({
      userId: ngozi.id, storeId: storeB.id, riderId: riderB.id,
      pickupAddressId: storeBAddr.id, dropoffAddressId: ngoziHome.id,
      items: [{ nameSnap: garri.name, quantity: 2, price: garri.price, productId: garri.id }, { nameSnap: eggs12.name, quantity: 1, price: eggs12.price, productId: eggs12.id }],
      deliveryFee: 750, commissionRate: storeB.commissionRate, paymentMethod: "CARD",
      orderStatus: "DISPATCHED", deliveryStatus: "IN_TRANSIT",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(40),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  console.log(`\n    ✓ Store B done (${deliveredConfigsB.length + 2 + 3} orders)`);

  // ══════════════════════════════════════════════════════════════════════════
  //  STORE C — HEALTHPLUS IKOYI (pharmacy)  14 orders
  // ══════════════════════════════════════════════════════════════════════════

  console.log("  💊  Store C — HealthPlus Ikoyi");

  // Delivered (9)
  const deliveredConfigsC = [
    { days: 27, customer: chisom,   dropAddr: chisomHome,   rider: riderB, items: [{ nameSnap: vitaminC.name,   quantity: 2, price: vitaminC.price,    productId: vitaminC.id },   { nameSnap: paracetamol.name, quantity: 1, price: paracetamol.price, productId: paracetamol.id }], fee: 600,  method: "CARD"   as const },
    { days: 23, customer: uche,     dropAddr: ucheHome,     rider: riderA, items: [{ nameSnap: glucometer.name, quantity: 1, price: glucometer.price,  productId: glucometer.id }],                                                                                                       fee: 500,  method: "WALLET" as const },
    { days: 20, customer: seun,     dropAddr: seunHome,     rider: riderB, items: [{ nameSnap: ibuprofen.name,  quantity: 2, price: ibuprofen.price,   productId: ibuprofen.id },  { nameSnap: handSanitizer.name,quantity: 1,price: handSanitizer.price,productId: handSanitizer.id }], fee: 700,  method: "CASH"   as const },
    { days: 17, customer: ngozi,    dropAddr: ngoziHome,    rider: riderA, items: [{ nameSnap: paracetamol.name,quantity: 3, price: paracetamol.price, productId: paracetamol.id }],                                                                                                      fee: 400,  method: "CARD"   as const },
    { days: 14, customer: damilola, dropAddr: damilolaHome, rider: riderB, items: [{ nameSnap: handSanitizer.name,quantity:2, price: handSanitizer.price,productId:handSanitizer.id},{ nameSnap: vitaminC.name,  quantity: 1, price: vitaminC.price,   productId: vitaminC.id }],       fee: 800,  method: "WALLET" as const },
    { days: 10, customer: chisom,   dropAddr: chisomWork,   rider: riderA, items: [{ nameSnap: glucometer.name, quantity: 1, price: glucometer.price,  productId: glucometer.id }],                                                                                                       fee: 600,  method: "CARD"   as const },
    { days: 7,  customer: uche,     dropAddr: ucheHome,     rider: riderB, items: [{ nameSnap: ibuprofen.name,  quantity: 1, price: ibuprofen.price,   productId: ibuprofen.id },  { nameSnap: paracetamol.name, quantity: 2, price: paracetamol.price, productId: paracetamol.id }],   fee: 450,  method: "CASH"   as const },
    { days: 4,  customer: seun,     dropAddr: seunHome,     rider: riderA, items: [{ nameSnap: vitaminC.name,   quantity: 1, price: vitaminC.price,    productId: vitaminC.id }],                                                                                                         fee: 500,  method: "WALLET" as const },
    { days: 1,  customer: ngozi,    dropAddr: ngoziHome,    rider: riderB, items: [{ nameSnap: handSanitizer.name,quantity:1,price:handSanitizer.price,productId:handSanitizer.id}, { nameSnap: ibuprofen.name,  quantity: 1, price: ibuprofen.price,   productId: ibuprofen.id }],     fee: 650,  method: "CARD"   as const },
  ];

  for (const cfg of deliveredConfigsC) {
    const sw = await getStoreWallet(storeC.id);
    const rw = await getRiderWallet(cfg.rider.id);
    await createOrder({
      userId: cfg.customer.id, storeId: storeC.id, riderId: cfg.rider.id,
      pickupAddressId: storeCAddr.id, dropoffAddressId: cfg.dropAddr.id,
      items: cfg.items, deliveryFee: cfg.fee, commissionRate: storeC.commissionRate,
      paymentMethod: cfg.method, orderStatus: "DELIVERED", deliveryStatus: "DELIVERED",
      paymentStatus: "COMPLETED", createdAt: daysAgo(cfg.days), deliveredAt: daysAgo(cfg.days, -1),
      storeWalletBefore: sw, riderWalletBefore: rw,
    });
    process.stdout.write(".");
  }

  // Cancelled (2)
  for (const cfg of [
    { days: 18, customer: damilola, items: [{ nameSnap: glucometer.name, quantity: 1, price: glucometer.price, productId: glucometer.id }], fee: 600, method: "CARD" as const },
    { days: 6,  customer: chisom,   items: [{ nameSnap: vitaminC.name,   quantity: 2, price: vitaminC.price,   productId: vitaminC.id }],   fee: 500, method: "WALLET" as const },
  ]) {
    const sw = await getStoreWallet(storeC.id);
    await createOrder({
      userId: cfg.customer.id, storeId: storeC.id,
      pickupAddressId: storeCAddr.id, dropoffAddressId: chisomHome.id,
      items: cfg.items, deliveryFee: cfg.fee, commissionRate: storeC.commissionRate,
      paymentMethod: cfg.method, orderStatus: "CANCELLED", deliveryStatus: "CANCELLED",
      paymentStatus: "REFUNDED", createdAt: daysAgo(cfg.days), cancelledAt: daysAgo(cfg.days, -1),
      storeWalletBefore: sw, riderWalletBefore: 0,
    });
    process.stdout.write(".");
  }

  // Active — Confirmed (10 min ago)
  {
    const sw = await getStoreWallet(storeC.id);
    await createOrder({
      userId: damilola.id, storeId: storeC.id, riderId: riderA.id,
      pickupAddressId: storeCAddr.id, dropoffAddressId: damilolaHome.id,
      items: [{ nameSnap: paracetamol.name, quantity: 2, price: paracetamol.price, productId: paracetamol.id }, { nameSnap: ibuprofen.name, quantity: 1, price: ibuprofen.price, productId: ibuprofen.id }],
      deliveryFee: 550, commissionRate: storeC.commissionRate, paymentMethod: "CARD",
      orderStatus: "CONFIRMED", deliveryStatus: "ASSIGNED",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(10),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  // Active — Preparing (25 min ago)
  {
    const sw = await getStoreWallet(storeC.id);
    await createOrder({
      userId: uche.id, storeId: storeC.id,
      pickupAddressId: storeCAddr.id, dropoffAddressId: ucheHome.id,
      items: [{ nameSnap: glucometer.name, quantity: 1, price: glucometer.price, productId: glucometer.id }],
      deliveryFee: 600, commissionRate: storeC.commissionRate, paymentMethod: "WALLET",
      orderStatus: "PREPARING", deliveryStatus: "PENDING",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(25),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  // Active — Dispatched (riderB on the way)
  {
    const sw = await getStoreWallet(storeC.id);
    await createOrder({
      userId: seun.id, storeId: storeC.id, riderId: riderB.id,
      pickupAddressId: storeCAddr.id, dropoffAddressId: seunHome.id,
      items: [{ nameSnap: handSanitizer.name, quantity: 1, price: handSanitizer.price, productId: handSanitizer.id }, { nameSnap: vitaminC.name, quantity: 1, price: vitaminC.price, productId: vitaminC.id }],
      deliveryFee: 700, commissionRate: storeC.commissionRate, paymentMethod: "CARD",
      orderStatus: "DISPATCHED", deliveryStatus: "IN_TRANSIT",
      paymentStatus: "COMPLETED", createdAt: minutesAgo(50),
      storeWalletBefore: sw, riderWalletBefore: 0, includeTransactions: false,
    });
    process.stdout.write(".");
  }

  console.log(`\n    ✓ Store C done (${deliveredConfigsC.length + 2 + 3} orders)`);

  // ══════════════════════════════════════════════════════════════════════════
  //  FINAL SUMMARY
  // ══════════════════════════════════════════════════════════════════════════

  const [fStoreA, fStoreB, fStoreC] = await Promise.all([
    prisma.store.findUnique({ where: { id: storeA.id } }),
    prisma.store.findUnique({ where: { id: storeB.id } }),
    prisma.store.findUnique({ where: { id: storeC.id } }),
  ]);
  const [fRiderA, fRiderB] = await Promise.all([
    prisma.rider.findUnique({ where: { id: riderA.id } }),
    prisma.rider.findUnique({ where: { id: riderB.id } }),
  ]);

  const totalOrders = (fStoreA!.totalOrders + fStoreB!.totalOrders + fStoreC!.totalOrders);

  console.log("\n✅  Store seed complete!");
  console.log("─────────────────────────────────────────────────────────────────");
  console.log("  STORES");
  console.log(`  Mama Put Lekki     │ ${String(fStoreA!.totalOrders).padStart(2)} delivered │ wallet ₦${fStoreA!.walletBalance.toLocaleString()} │ revenue ₦${fStoreA!.totalRevenue.toLocaleString()}`);
  console.log(`  Fresh Mart VI      │ ${String(fStoreB!.totalOrders).padStart(2)} delivered │ wallet ₦${fStoreB!.walletBalance.toLocaleString()} │ revenue ₦${fStoreB!.totalRevenue.toLocaleString()}`);
  console.log(`  HealthPlus Ikoyi   │ ${String(fStoreC!.totalOrders).padStart(2)} delivered │ wallet ₦${fStoreC!.walletBalance.toLocaleString()} │ revenue ₦${fStoreC!.totalRevenue.toLocaleString()}`);
  console.log("─────────────────────────────────────────────────────────────────");
  console.log("  RIDERS");
  console.log(`  Tayo Alabi         │ wallet ₦${fRiderA!.walletBalance.toLocaleString()}`);
  console.log(`  Felix Okafor       │ wallet ₦${fRiderB!.walletBalance.toLocaleString()}`);
  console.log("─────────────────────────────────────────────────────────────────");
  console.log("  CUSTOMERS (all password: Password123!)");
  customers.forEach((c) => console.log(`  ${c.name.padEnd(18)} │ ${c.email}`));
  console.log("─────────────────────────────────────────────────────────────────");
  console.log(`  Total seeded orders : ~${totalOrders} delivered + cancellations + 9 live`);
  console.log("─────────────────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());