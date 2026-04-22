import { PrismaClient } from "@prisma/client";
import * as bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// ─── Helpers ─────────────────────────────────────────────────────────────────

const daysAgo = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
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

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱  Seeding user with orders, rides & deliveries …\n");

  const hashedPassword = await bcrypt.hash("Password123!", 10);

  // ══════════════════════════════════════════════════════════════════════════
  //  PREREQUISITES — city, vendor, store, rider, products, addresses
  // ══════════════════════════════════════════════════════════════════════════

  const city = await prisma.city.upsert({
    where: { name: "Abuja" },
    update: {},
    create: { name: "Abuja", state: "FCT", isActive: true },
  });

  // ── User (the one we're seeding history for) ──────────────────────────────
  const user = await prisma.user.upsert({
    where: { email: "tunde.adeyemi@seed.dev" },
    update: {},
    create: {
      email: "tunde.adeyemi@seed.dev",
      password: hashedPassword,
      name: "Tunde Adeyemi",
      phone: "+2348031112222",
      role: "CUSTOMER",
      status: "ACTIVE",
      walletBalance: 8500,
    },
  });

  // ── Vendor & Store ────────────────────────────────────────────────────────
  const vendor = await prisma.vendor.upsert({
    where: { email: "nkechi.eze@seed.dev" },
    update: {},
    create: {
      email: "nkechi.eze@seed.dev",
      password: hashedPassword,
      name: "Nkechi Eze",
      phone: "+2348089998877",
      countryCode: "+234",
      businessType: "RESTAURANT",
      employees: "5-20",
      status: "ACTIVE",
    },
  });

  const store = await prisma.store.upsert({
    where: { slug: "nkechi-bites" },
    update: {},
    create: {
      name: "Nkechi's Bites",
      slug: "nkechi-bites",
      description: "Fast Nigerian home cooking",
      type: "RESTAURANT",
      address: "Plot 7 Garki Area 11, Abuja",
      lat: 9.0437,
      lng: 7.4957,
      status: "ACTIVE",
      verification: "VERIFIED",
      commissionRate: 10,
      prepTime: 20,
      isOpen: true,
      walletBalance: 0,
      totalOrders: 0,
      totalRevenue: 0,
      vendorId: vendor.id,
      cityId: city.id,
    },
  });

  // ── Rider ─────────────────────────────────────────────────────────────────
  const rider = await prisma.rider.upsert({
    where: { email: "emeka.okeke@seed.dev" },
    update: {},
    create: {
      email: "emeka.okeke@seed.dev",
      password: hashedPassword,
      name: "Emeka Okeke",
      phone: "+2347055443322",
      countryCode: "+234",
      role: "RIDER",
      status: "ACTIVE",
      isOnline: true,
      walletBalance: 0,
      commissionRate: 20,
      rating: 4.9,
      totalRides: 0,
      cityId: city.id,
      currentLat: 9.058,
      currentLng: 7.491,
    },
  });

  // ── Category & Products ───────────────────────────────────────────────────
  const category = await prisma.category.upsert({
    where: { slug: "nigerian-meals" },
    update: {},
    create: { name: "Nigerian Meals", slug: "nigerian-meals" },
  });

  const suya = await prisma.product.upsert({
    where: { slug: "suya-nkechi" },
    update: {},
    create: {
      name: "Suya Platter",
      slug: "suya-nkechi",
      description: "Spicy grilled beef suya with onions",
      price: 2000,
      status: "ACTIVE",
      stock: 100,
      manageStock: false,
      storeId: store.id,
      categoryId: category.id,
    },
  });

  const peppersoup = await prisma.product.upsert({
    where: { slug: "peppersoup-nkechi" },
    update: {},
    create: {
      name: "Catfish Peppersoup",
      slug: "peppersoup-nkechi",
      description: "Hot & spicy catfish pepper soup",
      price: 3500,
      status: "ACTIVE",
      stock: 50,
      manageStock: false,
      storeId: store.id,
      categoryId: category.id,
    },
  });

  const friedRice = await prisma.product.upsert({
    where: { slug: "fried-rice-nkechi" },
    update: {},
    create: {
      name: "Fried Rice + Chicken",
      slug: "fried-rice-nkechi",
      description: "Party fried rice with grilled chicken",
      price: 2800,
      status: "ACTIVE",
      stock: 80,
      manageStock: false,
      storeId: store.id,
      categoryId: category.id,
    },
  });

  // ── Addresses ─────────────────────────────────────────────────────────────
  const homeAddress = await prisma.address.create({
    data: {
      userId: user.id,
      label: "Home",
      street: "23 Adetokunbo Ademola Crescent, Wuse 2",
      city: "Abuja",
      state: "FCT",
      lat: 9.0765,
      lng: 7.4922,
      isDefault: true,
    },
  });

  const officeAddress = await prisma.address.create({
    data: {
      userId: user.id,
      label: "Office",
      street: "Central Business District, Plot 1144",
      city: "Abuja",
      state: "FCT",
      lat: 9.0579,
      lng: 7.4892,
      isDefault: false,
    },
  });

  const storeAddress = await prisma.address.create({
    data: {
      vendorId: vendor.id,
      label: "Store Pickup",
      street: "Plot 7 Garki Area 11",
      city: "Abuja",
      state: "FCT",
      lat: 9.0437,
      lng: 7.4957,
      isDefault: true,
    },
  });

  const pickupPoint = await prisma.address.create({
    data: {
      userId: user.id,
      label: "Friend's Place",
      street: "5 Ahmadu Bello Way, Garki",
      city: "Abuja",
      state: "FCT",
      lat: 9.0491,
      lng: 7.4875,
      isDefault: false,
    },
  });

  console.log("  ✓ Prerequisites ready\n");

  // ══════════════════════════════════════════════════════════════════════════
  //  ORDERS
  // ══════════════════════════════════════════════════════════════════════════

  // ── ORDER 1: Delivered — 14 days ago (cash) ───────────────────────────────
  console.log("  📦 Order 1: Delivered (cash, 14 days ago)");
  {
    const orderTotal = suya.price * 2 + peppersoup.price * 1; // 7500
    const deliveryFee = 800;
    const commission = orderTotal * 0.1;
    const vendorNet = orderTotal - commission;

    const group = await prisma.orderGroup.create({
      data: {
        userId: user.id,
        totalAmount: orderTotal + deliveryFee,
        paymentStatus: "COMPLETED",
        createdAt: daysAgo(14),
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        storeId: store.id,
        orderGroupId: group.id,
        total: orderTotal,
        status: "DELIVERED",
        paymentStatus: "PAID",
        createdAt: daysAgo(14),
        updatedAt: daysAgo(14),
        deliveredAt: daysAgo(14),
        items: {
          create: [
            { nameSnap: suya.name, quantity: 2, price: suya.price, productId: suya.id },
            { nameSnap: peppersoup.name, quantity: 1, price: peppersoup.price, productId: peppersoup.id },
          ],
        },
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        orderGroupId: group.id,
        userId: user.id,
        amount: orderTotal + deliveryFee,
        method: "CASH",
        status: "COMPLETED",
        reference: ref("CASH"),
        gateway: "CASH",
        paidAt: daysAgo(14),
        verifiedAt: daysAgo(14),
        createdAt: daysAgo(14),
        updatedAt: daysAgo(14),
      },
    });

    await prisma.orderGroup.update({
      where: { id: group.id },
      data: { payment: { connect: { id: payment.id } } },
    });

    await prisma.delivery.create({
      data: {
        orderId: order.id,
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: storeAddress.id,
        dropoffAddressId: homeAddress.id,
        status: "DELIVERED",
        recipientName: user.name,
        recipientPhone: user.phone!,
        deliveryFee,
        distanceKm: 3.8,
        orderGroupId: group.id,
        assignedAt: daysAgo(14),
        pickedUpAt: daysAgo(14),
        deliveredAt: daysAgo(14),
        createdAt: daysAgo(14),
        updatedAt: daysAgo(14),
      },
    });

    // Transactions
    for (const [type, amount, entityType, entityId, desc] of [
      ["PAYMENT_RECEIVED", orderTotal + deliveryFee, "PLATFORM", "platform", "Cash payment received"],
      ["COMMISSION_DEDUCTED", commission, "STORE", store.id, "10% commission"],
      ["VENDOR_EARNING", vendorNet, "STORE", store.id, "Vendor net earning"],
      ["RIDER_EARNING", deliveryFee * 0.8, "RIDER", rider.id, "Rider delivery fee"],
    ] as [string, number, string, string, string][]) {
      await prisma.transaction.create({
        data: {
          type: type as any,
          amount,
          entityType: entityType as any,
          entityId,
          orderId: order.id,
          orderGroupId: group.id,
          balanceBefore: 0,
          balanceAfter: amount,
          description: desc,
          status: "COMPLETED",
          createdAt: daysAgo(14),
        },
      });
    }

    await prisma.store.update({
      where: { id: store.id },
      data: { walletBalance: { increment: vendorNet }, totalRevenue: { increment: orderTotal }, totalOrders: { increment: 1 } },
    });
    await prisma.rider.update({
      where: { id: rider.id },
      data: { walletBalance: { increment: deliveryFee * 0.8 } },
    });
    console.log("    ✓ Order 1 →", order.id);
  }

  // ── ORDER 2: Delivered — 7 days ago (Paystack card) ──────────────────────
  console.log("  📦 Order 2: Delivered (card / Paystack, 7 days ago)");
  {
    const orderTotal = friedRice.price * 2; // 5600
    const deliveryFee = 600;
    const commission = orderTotal * 0.1;
    const vendorNet = orderTotal - commission;

    const group = await prisma.orderGroup.create({
      data: {
        userId: user.id,
        totalAmount: orderTotal + deliveryFee,
        paymentStatus: "COMPLETED",
        createdAt: daysAgo(7),
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        storeId: store.id,
        orderGroupId: group.id,
        total: orderTotal,
        status: "DELIVERED",
        paymentStatus: "PAID",
        createdAt: daysAgo(7),
        updatedAt: daysAgo(7),
        deliveredAt: daysAgo(7),
        items: {
          create: [
            { nameSnap: friedRice.name, quantity: 2, price: friedRice.price, productId: friedRice.id },
          ],
        },
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        orderGroupId: group.id,
        userId: user.id,
        amount: orderTotal + deliveryFee,
        method: "CARD",
        status: "COMPLETED",
        reference: ref("PSK"),
        gateway: "PAYSTACK",
        transactionId: `TXN${Date.now()}`,
        paidAt: daysAgo(7),
        verifiedAt: daysAgo(7),
        createdAt: daysAgo(7),
        updatedAt: daysAgo(7),
      },
    });

    await prisma.orderGroup.update({
      where: { id: group.id },
      data: { payment: { connect: { id: payment.id } } },
    });

    const storeWallet = await prisma.store
      .findUnique({ where: { id: store.id } })
      .then((s) => s!.walletBalance);

    await prisma.delivery.create({
      data: {
        orderId: order.id,
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: storeAddress.id,
        dropoffAddressId: officeAddress.id,
        status: "DELIVERED",
        recipientName: user.name,
        recipientPhone: user.phone!,
        deliveryFee,
        distanceKm: 5.1,
        orderGroupId: group.id,
        assignedAt: daysAgo(7),
        pickedUpAt: daysAgo(7),
        deliveredAt: daysAgo(7),
        createdAt: daysAgo(7),
        updatedAt: daysAgo(7),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: orderTotal + deliveryFee,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        orderId: order.id,
        orderGroupId: group.id,
        balanceBefore: 0,
        balanceAfter: orderTotal + deliveryFee,
        description: "Card payment via Paystack",
        status: "COMPLETED",
        createdAt: daysAgo(7),
      },
    });
    await prisma.transaction.create({
      data: {
        type: "VENDOR_EARNING",
        amount: vendorNet,
        entityType: "STORE",
        entityId: store.id,
        orderId: order.id,
        orderGroupId: group.id,
        balanceBefore: storeWallet,
        balanceAfter: storeWallet + vendorNet,
        description: "Vendor net earning after 10% commission",
        status: "COMPLETED",
        createdAt: daysAgo(7),
      },
    });

    await prisma.store.update({
      where: { id: store.id },
      data: { walletBalance: { increment: vendorNet }, totalRevenue: { increment: orderTotal }, totalOrders: { increment: 1 } },
    });
    await prisma.rider.update({ where: { id: rider.id }, data: { walletBalance: { increment: deliveryFee * 0.8 } } });
    console.log("    ✓ Order 2 →", order.id);
  }

  // ── ORDER 3: Cancelled + Refunded — 3 days ago ────────────────────────────
  console.log("  📦 Order 3: Cancelled & refunded (3 days ago)");
  {
    const orderTotal = suya.price * 3; // 6000
    const deliveryFee = 700;

    const group = await prisma.orderGroup.create({
      data: {
        userId: user.id,
        totalAmount: orderTotal + deliveryFee,
        paymentStatus: "REFUNDED",
        createdAt: daysAgo(3),
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        storeId: store.id,
        orderGroupId: group.id,
        total: orderTotal,
        status: "CANCELLED",
        paymentStatus: "REFUNDED",
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
        cancelledAt: daysAgo(3),
        items: {
          create: [
            { nameSnap: suya.name, quantity: 3, price: suya.price, productId: suya.id },
          ],
        },
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        orderGroupId: group.id,
        userId: user.id,
        amount: orderTotal + deliveryFee,
        method: "CARD",
        status: "REFUNDED",
        reference: ref("PSK"),
        gateway: "PAYSTACK",
        transactionId: `TXN${Date.now()}`,
        paidAt: daysAgo(3),
        verifiedAt: daysAgo(3),
        createdAt: daysAgo(3),
        updatedAt: daysAgo(3),
      },
    });

    await prisma.orderGroup.update({
      where: { id: group.id },
      data: { payment: { connect: { id: payment.id } } },
    });

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: orderTotal + deliveryFee,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        orderId: order.id,
        orderGroupId: group.id,
        balanceBefore: 0,
        balanceAfter: orderTotal + deliveryFee,
        description: "Payment for cancelled order",
        status: "REVERSED",
        createdAt: daysAgo(3),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "REFUND_ISSUED",
        amount: orderTotal + deliveryFee,
        entityType: "PLATFORM",
        entityId: "platform",
        orderId: order.id,
        orderGroupId: group.id,
        balanceBefore: orderTotal + deliveryFee,
        balanceAfter: 0,
        description: "Full refund — store rejected order",
        metadata: { reason: "Store out of stock", method: "CARD_REVERSAL" },
        status: "COMPLETED",
        createdAt: daysAgo(3),
      },
    });

    console.log("    ✓ Order 3 (cancelled) →", order.id);
  }

  // ── ORDER 4: Currently PREPARING (placed 30 min ago) ─────────────────────
  console.log("  📦 Order 4: Active — store is preparing (30 min ago)");
  {
    const orderTotal = peppersoup.price * 1 + friedRice.price * 1; // 6300
    const deliveryFee = 900;

    const group = await prisma.orderGroup.create({
      data: {
        userId: user.id,
        totalAmount: orderTotal + deliveryFee,
        paymentStatus: "COMPLETED",
        createdAt: minutesAgo(30),
      },
    });

    const order = await prisma.order.create({
      data: {
        userId: user.id,
        storeId: store.id,
        orderGroupId: group.id,
        total: orderTotal,
        status: "PREPARING",
        paymentStatus: "PAID",
        createdAt: minutesAgo(30),
        updatedAt: minutesAgo(20),
        items: {
          create: [
            { nameSnap: peppersoup.name, quantity: 1, price: peppersoup.price, productId: peppersoup.id },
            { nameSnap: friedRice.name, quantity: 1, price: friedRice.price, productId: friedRice.id },
          ],
        },
      },
    });

    const payment = await prisma.payment.create({
      data: {
        orderId: order.id,
        orderGroupId: group.id,
        userId: user.id,
        amount: orderTotal + deliveryFee,
        method: "WALLET",
        status: "COMPLETED",
        reference: ref("WLT"),
        gateway: "WALLET",
        paidAt: minutesAgo(30),
        verifiedAt: minutesAgo(30),
        createdAt: minutesAgo(30),
        updatedAt: minutesAgo(30),
      },
    });

    await prisma.orderGroup.update({
      where: { id: group.id },
      data: { payment: { connect: { id: payment.id } } },
    });

    // Delivery assigned but rider hasn't picked up yet
    await prisma.delivery.create({
      data: {
        orderId: order.id,
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: storeAddress.id,
        dropoffAddressId: homeAddress.id,
        status: "ASSIGNED",
        recipientName: user.name,
        recipientPhone: user.phone!,
        deliveryFee,
        distanceKm: 4.5,
        orderGroupId: group.id,
        assignedAt: minutesAgo(20),
        createdAt: minutesAgo(30),
        updatedAt: minutesAgo(20),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: orderTotal + deliveryFee,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        orderId: order.id,
        orderGroupId: group.id,
        balanceBefore: 0,
        balanceAfter: orderTotal + deliveryFee,
        description: "Wallet payment — order being prepared",
        status: "COMPLETED",
        createdAt: minutesAgo(30),
      },
    });

    console.log("    ✓ Order 4 (active) →", order.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  RIDES
  // ══════════════════════════════════════════════════════════════════════════

  // ── RIDE 1: Completed — 10 days ago (cash) ────────────────────────────────
  console.log("\n  🚖 Ride 1: Completed (cash, 10 days ago)");
  {
    const totalFare = 2200;
    const platformFee = totalFare * 0.2;
    const driverFee = totalFare - platformFee;

    const ride = await prisma.ride.create({
      data: {
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: homeAddress.id,
        dropoffAddressId: officeAddress.id,
        status: "COMPLETED",
        baseFare: 1000,
        distanceFare: 900,
        timeFare: 300,
        surgeMultiplier: 1.0,
        platformFee,
        driverFee,
        totalFare,
        distanceKm: 8.2,
        durationMin: 22,
        vehicleType: "ECONOMY",
        acceptedAt: daysAgo(10),
        startedAt: daysAgo(10),
        completedAt: daysAgo(10),
        createdAt: daysAgo(10),
        updatedAt: daysAgo(10),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        rideId: ride.id,
        userId: user.id,
        amount: totalFare,
        method: "CASH",
        status: "COMPLETED",
        reference: ref("RIDE-CASH"),
        gateway: "CASH",
        paidAt: daysAgo(10),
        verifiedAt: daysAgo(10),
        createdAt: daysAgo(10),
        updatedAt: daysAgo(10),
      },
    });

    const riderWallet = await prisma.rider
      .findUnique({ where: { id: rider.id } })
      .then((r) => r!.walletBalance);

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: totalFare,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        rideId: ride.id,
        balanceBefore: 0,
        balanceAfter: totalFare,
        description: "Cash ride fare collected",
        status: "COMPLETED",
        createdAt: daysAgo(10),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "RIDER_EARNING",
        amount: driverFee,
        entityType: "RIDER",
        entityId: rider.id,
        rideId: ride.id,
        balanceBefore: riderWallet,
        balanceAfter: riderWallet + driverFee,
        description: "Rider fare (80% of total)",
        metadata: { vehicleType: "ECONOMY", distanceKm: 8.2, durationMin: 22 },
        status: "COMPLETED",
        createdAt: daysAgo(10),
      },
    });

    await prisma.rider.update({
      where: { id: rider.id },
      data: { walletBalance: { increment: driverFee }, totalRides: { increment: 1 } },
    });

    console.log("    ✓ Ride 1 →", ride.id);
  }

  // ── RIDE 2: Completed — 5 days ago (card, BUSINESS) ──────────────────────
  console.log("  🚖 Ride 2: Completed (card / Paystack, Business, 5 days ago)");
  {
    const totalFare = 5500;
    const platformFee = totalFare * 0.2;
    const driverFee = totalFare - platformFee;

    const ride = await prisma.ride.create({
      data: {
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: officeAddress.id,
        dropoffAddressId: homeAddress.id,
        status: "COMPLETED",
        baseFare: 2500,
        distanceFare: 2000,
        timeFare: 1000,
        surgeMultiplier: 1.0,
        platformFee,
        driverFee,
        totalFare,
        distanceKm: 14.6,
        durationMin: 35,
        vehicleType: "BUSINESS",
        acceptedAt: daysAgo(5),
        startedAt: daysAgo(5),
        completedAt: daysAgo(5),
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        rideId: ride.id,
        userId: user.id,
        amount: totalFare,
        method: "CARD",
        status: "COMPLETED",
        reference: ref("RIDE-PSK"),
        gateway: "PAYSTACK",
        transactionId: `TXN${Date.now()}`,
        paidAt: daysAgo(5),
        verifiedAt: daysAgo(5),
        createdAt: daysAgo(5),
        updatedAt: daysAgo(5),
      },
    });

    const riderWallet = await prisma.rider
      .findUnique({ where: { id: rider.id } })
      .then((r) => r!.walletBalance);

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: totalFare,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        rideId: ride.id,
        balanceBefore: 0,
        balanceAfter: totalFare,
        description: "Card payment — Business ride",
        status: "COMPLETED",
        createdAt: daysAgo(5),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "RIDER_EARNING",
        amount: driverFee,
        entityType: "RIDER",
        entityId: rider.id,
        rideId: ride.id,
        balanceBefore: riderWallet,
        balanceAfter: riderWallet + driverFee,
        description: "Rider earning — Business class fare",
        metadata: { vehicleType: "BUSINESS", distanceKm: 14.6, durationMin: 35 },
        status: "COMPLETED",
        createdAt: daysAgo(5),
      },
    });

    await prisma.rider.update({
      where: { id: rider.id },
      data: { walletBalance: { increment: driverFee }, totalRides: { increment: 1 } },
    });

    console.log("    ✓ Ride 2 →", ride.id);
  }

  // ── RIDE 3: Cancelled by user — 2 days ago ────────────────────────────────
  console.log("  🚖 Ride 3: Cancelled by user (2 days ago)");
  {
    const ride = await prisma.ride.create({
      data: {
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: homeAddress.id,
        dropoffAddressId: pickupPoint.id,
        status: "CANCELLED_BY_USER",
        vehicleType: "ECONOMY",
        totalFare: 1800,
        cancellationReason: "Changed my mind",
        cancelledBy: user.id,
        cancelledAt: daysAgo(2),
        createdAt: daysAgo(2),
        updatedAt: daysAgo(2),
      },
    });

    console.log("    ✓ Ride 3 (cancelled) →", ride.id);
  }

  // ── RIDE 4: Scheduled — tomorrow at 07:00 ─────────────────────────────────
  console.log("  🚖 Ride 4: Scheduled (tomorrow 07:00 AM)");
  {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(7, 0, 0, 0);

    const cancellationDeadline = new Date(tomorrow);
    cancellationDeadline.setHours(6, 30, 0, 0);

    const estimatedEnd = new Date(tomorrow);
    estimatedEnd.setHours(7, 40, 0, 0);

    const ride = await prisma.ride.create({
      data: {
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: homeAddress.id,
        dropoffAddressId: officeAddress.id,
        status: "DRIVER_ASSIGNED_SCHED",
        isScheduled: true,
        scheduledAt: tomorrow,
        scheduledFare: 3200,
        totalFare: 3200,
        cancellationDeadline,
        estimatedDurationMin: 40,
        estimatedEndTime: estimatedEnd,
        assignmentWindowMin: 90,
        assignedBy: "ADMIN",
        vehicleType: "ECONOMY",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        rideId: ride.id,
        userId: user.id,
        amount: 3200,
        method: "WALLET",
        status: "PENDING",
        reference: ref("RIDE-SCHED"),
        gateway: "WALLET",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    });

    console.log("    ✓ Ride 4 (scheduled) →", ride.id);
  }

  // ── RIDE 5: In Progress — right now ──────────────────────────────────────
  console.log("  🚖 Ride 5: IN_PROGRESS (happening now)");
  {
    const totalFare = 1900;

    const ride = await prisma.ride.create({
      data: {
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: pickupPoint.id,
        dropoffAddressId: homeAddress.id,
        status: "IN_PROGRESS",
        baseFare: 800,
        distanceFare: 800,
        timeFare: 300,
        surgeMultiplier: 1.0,
        platformFee: totalFare * 0.2,
        driverFee: totalFare * 0.8,
        totalFare,
        distanceKm: 6.1,
        durationMin: 18,
        vehicleType: "ECONOMY",
        acceptedAt: minutesAgo(25),
        startedAt: minutesAgo(10),
        createdAt: minutesAgo(30),
        updatedAt: minutesAgo(10),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        rideId: ride.id,
        userId: user.id,
        amount: totalFare,
        method: "CARD",
        status: "COMPLETED",
        reference: ref("RIDE-LIVE"),
        gateway: "PAYSTACK",
        transactionId: `TXN${Date.now()}`,
        paidAt: minutesAgo(25),
        verifiedAt: minutesAgo(25),
        createdAt: minutesAgo(30),
        updatedAt: minutesAgo(25),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: totalFare,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        rideId: ride.id,
        balanceBefore: 0,
        balanceAfter: totalFare,
        description: "Ride in progress — fare pre-authorised",
        status: "PENDING",
        createdAt: minutesAgo(25),
      },
    });

    console.log("    ✓ Ride 5 (live) →", ride.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  STANDALONE DELIVERIES
  // ══════════════════════════════════════════════════════════════════════════

  // ── DELIVERY 1: Completed — sent package 9 days ago ──────────────────────
  console.log("\n  📬 Delivery 1: Standalone completed (9 days ago)");
  {
    const deliveryFee = 2000;

    const delivery = await prisma.delivery.create({
      data: {
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: homeAddress.id,
        dropoffAddressId: pickupPoint.id,
        status: "DELIVERED",
        senderName: user.name,
        senderPhone: user.phone!,
        recipientName: "Bola Tinubu Jr.",
        recipientPhone: "+2348044556677",
        packageDetails: "Laptop and charger in a sealed box",
        weightKg: 2.5,
        isFragile: true,
        declaredValue: 150000,
        deliveryFee,
        distanceKm: 9.2,
        assignedAt: daysAgo(9),
        pickedUpAt: daysAgo(9),
        deliveredAt: daysAgo(9),
        createdAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        deliveryId: delivery.id,
        userId: user.id,
        amount: deliveryFee,
        method: "CARD",
        status: "COMPLETED",
        reference: ref("DEL-PSK"),
        gateway: "PAYSTACK",
        transactionId: `TXN${Date.now()}`,
        paidAt: daysAgo(9),
        verifiedAt: daysAgo(9),
        createdAt: daysAgo(9),
        updatedAt: daysAgo(9),
      },
    });

    const riderWallet = await prisma.rider
      .findUnique({ where: { id: rider.id } })
      .then((r) => r!.walletBalance);

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: deliveryFee,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        deliveryId: delivery.id,
        balanceBefore: 0,
        balanceAfter: deliveryFee,
        description: "Standalone delivery fee paid",
        status: "COMPLETED",
        createdAt: daysAgo(9),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "RIDER_EARNING",
        amount: deliveryFee * 0.8,
        entityType: "RIDER",
        entityId: rider.id,
        deliveryId: delivery.id,
        balanceBefore: riderWallet,
        balanceAfter: riderWallet + deliveryFee * 0.8,
        description: "Rider earnings — standalone delivery",
        metadata: { isFragile: true, weightKg: 2.5, declaredValue: 150000 },
        status: "COMPLETED",
        createdAt: daysAgo(9),
      },
    });

    await prisma.rider.update({
      where: { id: rider.id },
      data: { walletBalance: { increment: deliveryFee * 0.8 } },
    });

    console.log("    ✓ Delivery 1 →", delivery.id);
  }

  // ── DELIVERY 2: In Transit — right now ───────────────────────────────────
  console.log("  📬 Delivery 2: In transit (happening now)");
  {
    const deliveryFee = 1500;

    const delivery = await prisma.delivery.create({
      data: {
        customerId: user.id,
        riderId: rider.id,
        pickupAddressId: storeAddress.id,
        dropoffAddressId: homeAddress.id,
        status: "IN_TRANSIT",
        senderName: "Kemi Ajoke",
        senderPhone: "+2348066778899",
        recipientName: user.name,
        recipientPhone: user.phone!,
        packageDetails: "Clothing items",
        weightKg: 1.0,
        isFragile: false,
        isPerishable: false,
        deliveryFee,
        distanceKm: 6.4,
        assignedAt: hoursAgo(1),
        pickedUpAt: minutesAgo(20),
        createdAt: hoursAgo(1),
        updatedAt: minutesAgo(20),
      },
    });

    const payment = await prisma.payment.create({
      data: {
        deliveryId: delivery.id,
        userId: user.id,
        amount: deliveryFee,
        method: "WALLET",
        status: "COMPLETED",
        reference: ref("DEL-WLT"),
        gateway: "WALLET",
        paidAt: hoursAgo(1),
        verifiedAt: hoursAgo(1),
        createdAt: hoursAgo(1),
        updatedAt: hoursAgo(1),
      },
    });

    await prisma.transaction.create({
      data: {
        type: "PAYMENT_RECEIVED",
        amount: deliveryFee,
        entityType: "PLATFORM",
        entityId: "platform",
        paymentId: payment.id,
        deliveryId: delivery.id,
        balanceBefore: 0,
        balanceAfter: deliveryFee,
        description: "Delivery fee — package in transit",
        status: "COMPLETED",
        createdAt: hoursAgo(1),
      },
    });

    console.log("    ✓ Delivery 2 (live) →", delivery.id);
  }

  // ── DELIVERY 3: Cancelled — 6 days ago ───────────────────────────────────
  console.log("  📬 Delivery 3: Cancelled (6 days ago)");
  {
    const deliveryFee = 1200;

    const delivery = await prisma.delivery.create({
      data: {
        customerId: user.id,
        pickupAddressId: homeAddress.id,
        dropoffAddressId: officeAddress.id,
        status: "CANCELLED",
        senderName: user.name,
        senderPhone: user.phone!,
        recipientName: "Fatima Musa",
        recipientPhone: "+2348077889900",
        packageDetails: "Documents",
        weightKg: 0.3,
        isFragile: false,
        deliveryFee,
        distanceKm: 4.0,
        createdAt: daysAgo(6),
        updatedAt: daysAgo(6),
      },
    });

    console.log("    ✓ Delivery 3 (cancelled) →", delivery.id);
  }

  // ══════════════════════════════════════════════════════════════════════════
  //  SUMMARY
  // ══════════════════════════════════════════════════════════════════════════

  const finalUser   = await prisma.user.findUnique({ where: { id: user.id } });
  const finalRider  = await prisma.rider.findUnique({ where: { id: rider.id } });
  const finalStore  = await prisma.store.findUnique({ where: { id: store.id } });

  console.log("\n✅  Seed complete!");
  console.log("─────────────────────────────────────────────────────────");
  console.log(`  User     : ${user.name} <${user.email}>`);
  console.log(`  Password : Password123!`);
  console.log(`  Wallet   : ₦${finalUser?.walletBalance.toLocaleString()}`);
  console.log("");
  console.log(`  Orders   : 4  (2 delivered · 1 cancelled · 1 preparing)`);
  console.log(`  Rides    : 5  (2 completed · 1 cancelled · 1 scheduled · 1 live)`);
  console.log(`  Deliveries: 3  (1 completed · 1 in-transit · 1 cancelled)`);
  console.log("");
  console.log(`  Store wallet  : ₦${finalStore?.walletBalance.toLocaleString()}`);
  console.log(`  Rider wallet  : ₦${finalRider?.walletBalance.toLocaleString()}`);
  console.log("─────────────────────────────────────────────────────────");
}

main()
  .catch((e) => {
    console.error("❌  Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());