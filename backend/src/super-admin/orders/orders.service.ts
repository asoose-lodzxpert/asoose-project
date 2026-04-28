import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { OrderFilterDto } from './dto/order-filter.dto';
import { Prisma, StoreType, OrderStatus } from '@prisma/client';
import { TransactionLedgerService } from '../transactions/transaction-ledger.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { InventoryService } from 'src/users/inventory.service';

const SERVICE_TYPE_MAP: Record<string, StoreType> = {
  Food: 'RESTAURANT',
  Grocery: 'GROCERY',
  Pharmacy: 'PHARMACY',
  Logistics: 'MARKET',
};

@Injectable()
export class OrdersService {
  constructor(
    private prisma: PrismaService,
    private ledgerService: TransactionLedgerService,
    private eventEmitter: EventEmitter2,
    private inventoryService: InventoryService,
  ) {}

  // ===========================================================================
  // 1. LIST ORDERS (Fixed for Multi-Vendor)
  // ===========================================================================
  async findAll(query: OrderFilterDto) {
    const { search, status, type, from, to, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const storeType =
      type && type !== 'All' ? SERVICE_TYPE_MAP[type] : undefined;

    // Use raw SQL to get unique "Entries" (Group ID or Solo Order ID)
    // This handles unified pagination while showing only one row per group.
    
    // Build dynamic conditions for raw SQL
    const conditions: string[] = [];
    const params: any[] = [];

    if (storeType) {
      conditions.push(`s.type = $${params.length + 1}`);
      params.push(storeType);
    }

    if (status && status !== 'All') {
      conditions.push(`o.status = $${params.length + 1}::"OrderStatus"`);
      params.push(status);
    }

    if (from) {
      conditions.push(`o."createdAt" >= $${params.length + 1}`);
      params.push(new Date(new Date(from).setHours(0, 0, 0, 0)));
    }
    if (to) {
      conditions.push(`o."createdAt" <= $${params.length + 1}`);
      params.push(new Date(new Date(to).setHours(23, 59, 59, 999)));
    }

    if (search) {
      // Strip any ID prefixes: del#, track#, delivery#, or just # for copied shortened IDs
      const normalizedSearch = search.trim().replace(/^(TRACK#|DEL#|DELIVERY#|#)/i, '').trim();
      const searchIdx = params.length + 1;
      conditions.push(`(
        o.id ILIKE $${searchIdx} OR 
        u.name ILIKE $${searchIdx} OR 
        s.name ILIKE $${searchIdx} OR 
        o."orderGroupId" ILIKE $${searchIdx}
      )`);
      params.push(`%${normalizedSearch}%`);
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Step 1 — Get unique Entry IDs (Group or Solo)
    // We sort by the LATEST creation date in a group if it exists
    const entries = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT 
        COALESCE(o."orderGroupId", o.id) as "id",
        MAX(o."createdAt") as "sortDate",
        CASE WHEN o."orderGroupId" IS NOT NULL THEN 'GROUP' ELSE 'SOLO' END as "entryType"
      FROM "Order" o
      JOIN "Store" s ON o."storeId" = s.id
      JOIN "User" u ON o."userId" = u.id
      ${whereClause}
      GROUP BY COALESCE(o."orderGroupId", o.id), "entryType"
      ORDER BY "sortDate" DESC
      LIMIT ${Number(limit)} OFFSET ${skip}
    `, ...params);

    // Step 2 — Get total count of unique entries
    const countResult = await this.prisma.$queryRawUnsafe<any[]>(`
      SELECT COUNT(DISTINCT COALESCE(o."orderGroupId", o.id)) as count
      FROM "Order" o
      JOIN "Store" s ON o."storeId" = s.id
      JOIN "User" u ON o."userId" = u.id
      ${whereClause}
    `, ...params);
    const totalCount = Number(countResult[0]?.count || 0);

    // Step 3 — Hydrate entries with full data
    const data = await Promise.all(
      entries.map(async (entry) => {
        if (entry.entryType === 'GROUP') {
          const group = await this.prisma.orderGroup.findUnique({
            where: { id: entry.id },
            include: {
              user: { select: { name: true } },
              orders: {
                include: {
                  store: { select: { name: true, type: true } },
                  payment: { select: { status: true } },
                },
              },
              payment: { select: { status: true, amount: true, method: true } },
            },
          });
          if (!group) return null;

          return {
            id: group.id,
            groupId: group.id,
            status: this.deriveGroupStatus(group.orders),
            customer: group.user.name,
            vendor: `Multi-vendor (${group.orders.length} stores)`,
            rider: 'Multi-stop Delivery',
            amount: group.totalAmount,
            paymentStatus: group.payment?.status ?? 'UNPAID',
            type: 'Mixed',
            placedAt: group.createdAt.toISOString(),
          };
        } else {
          const order = await this.prisma.order.findUnique({
            where: { id: entry.id },
            include: {
              user: { select: { name: true } },
              store: { select: { name: true, type: true } },
              payment: { select: { status: true, amount: true, method: true } },
              delivery: { include: { rider: { select: { name: true } } } },
            },
          });
          if (!order) return null;

          return {
            id: order.id,
            groupId: null,
            status: order.status,
            customer: order.user.name,
            vendor: order.store.name,
            rider: order.delivery?.rider?.name ?? 'Unassigned',
            amount: order.total,
            paymentStatus: order.payment?.status ?? 'UNPAID',
            type: this.mapStoreTypeToService(order.store.type),
            placedAt: order.createdAt.toISOString(),
          };
        }
      }),
    );

    return {
      data: data.filter(Boolean),
      meta: {
        total: totalCount,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(totalCount / Number(limit)),
      },
    };
  }

  // ===========================================================================
  // 2. GET SINGLE ORDER (Fixed for Multi-Vendor)
  // ===========================================================================
  async findOne(id: string) {
    // 1. Try fetching as standard Order
    let order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        user: true,
        store: {
          include: {
            vendor: { select: { name: true, phone: true, email: true } },
          },
        },
        items: {
          include: {
            product: true,
            modifiers: true,
          },
        },
        payment: true,
        orderGroup: {
          include: {
            payment: true,
            orders: {
              include: {
                store: { select: { name: true, address: true, vendor: true } },
                items: { include: { product: true, modifiers: true } },
                delivery: true,
              },
            },
          },
        },
        delivery: {
          include: {
            rider: { include: { vehicle: true } },
            pickupAddress: true,
            dropoffAddress: true,
          },
        },
      },
    });

    // 2. If not found, try fetching as OrderGroup ID
    if (!order) {
      const group = await this.prisma.orderGroup.findUnique({
        where: { id },
        include: {
          orders: { select: { id: true } },
        },
      });
      if (group && group.orders.length > 0) {
        // Redirect to the first order of the group to reuse the logic
        return this.findOne(group.orders[0].id);
      }
      throw new NotFoundException(`Order #${id} not found`);
    }

    const logs = await this.prisma.activityLog.findMany({
      where: { target: { contains: id } },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: { user: { select: { name: true } } },
    });

    const dispute = await this.prisma.dispute.findFirst({
      where: { orderId: id, status: 'OPEN' },
      select: { id: true, reason: true },
    });

    return this.transformForDetail(order, logs, dispute);
  }

  // ===========================================================================
  // 3. COMPLETE ORDER (Fixed Ledger Logic)
  // ===========================================================================
  async completeOrder(id: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        orderGroup: { include: { payment: true } }, // Fetch group payment
        store: { select: { id: true, commissionRate: true } },
        user: { select: { id: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (order.status === 'DELIVERED') {
      throw new BadRequestException('Order already completed');
    }

    // Resolve Payment
    const payment = order.payment || order.orderGroup?.payment;

    return this.prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id },
        data: { status: 'DELIVERED', deliveredAt: new Date() },
      });

      // Γ£à LOGIC FIX: Check resolved payment
      if (payment && payment.status === 'COMPLETED') {
        // Record Commission (Vendor Earning)
        await this.ledgerService.recordOrderCommission({
          id: order.id,
          storeId: order.store.id,
          total: order.total,
          commissionRate: order.store.commissionRate || 20,
        });
        // Note: We do NOT record 'PAYMENT_RECEIVED' here as it's handled by Webhook
      }

      await tx.activityLog.create({
        data: {
          userId: 'SYSTEM',
          action: 'ORDER_COMPLETED',
          target: id,
          metadata: {
            completedAt: new Date().toISOString(),
            totalAmount: order.total,
            paymentSource: order.orderGroupId ? 'GROUP' : 'DIRECT',
          },
        },
      });

      return updatedOrder;
    });
  }

  // ===========================================================================
  // 4. CANCEL ORDER (Fixed for Multi-Vendor Refund Safety)
  // ===========================================================================
  async remove(id: string, adminUserId?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        orderGroup: { include: { payment: true } },
        user: { select: { id: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');
    if (['DELIVERED', 'CANCELLED', 'REJECTED'].includes(order.status)) {
      throw new BadRequestException(
        `Cannot cancel order that is ${order.status}`,
      );
    }

    // Resolve Payment
    const payment = order.payment || order.orderGroup?.payment;

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
        include: { items: true },
      });

      // Restore stock
      await this.inventoryService.atomicIncrementStock(tx, updated.items);

      if (payment && payment.status === 'COMPLETED') {
        // Logic: If Group Payment, mark Partially Refunded. If Single, Refunded.
        const newPaymentStatus = order.orderGroupId
          ? 'PARTIALLY_REFUNDED'
          : 'REFUNDED';

        await tx.payment.update({
          where: { id: payment.id },
          data: { status: newPaymentStatus },
        });

        // Record Refund (Only for this order's amount)
        await this.ledgerService.recordRefund({
          id: payment.id,
          amount: order.total,
          userId: order.user.id,
          orderId: order.id,
        });
      }

      await tx.activityLog.create({
        data: {
          userId: adminUserId || 'SUPER_ADMIN',
          action: 'ORDER_CANCELLED',
          target: id,
          metadata: {
            reason: 'Admin Force Cancel',
            refunded: payment?.status === 'COMPLETED',
            isGroupCancel: !!order.orderGroupId,
          },
        },
      });
    });
  }

  // ===========================================================================
  // 5. REFUND ORDER (New Partial Refund Architecture)
  // ===========================================================================
  async refundOrder(id: string, refundAmount?: number, reason?: string) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        payment: true,
        orderGroup: { include: { payment: true } },
        user: { select: { id: true } },
      },
    });

    if (!order) throw new NotFoundException('Order not found');

    // Resolve Payment
    const payment = order.payment || order.orderGroup?.payment;

    if (!payment)
      throw new BadRequestException('No payment found for this order');
    if (
      payment.status !== 'COMPLETED' &&
      payment.status !== 'PARTIALLY_REFUNDED'
    ) {
      throw new BadRequestException('Can only refund completed payments');
    }

    // Cap refund at Order Total (not Payment Total, which might be group total)
    const amountToRefund = refundAmount || order.total;
    if (amountToRefund > order.total) {
      throw new BadRequestException('Refund amount exceeds order total');
    }

    return this.prisma.$transaction(async (tx) => {
      // Update Payment Status
      const newStatus =
        amountToRefund === payment.amount ? 'REFUNDED' : 'PARTIALLY_REFUNDED';

      await tx.payment.update({
        where: { id: payment.id },
        data: { status: newStatus },
      });

      // Record Refund in Ledger linked to this specific orderId
      await this.ledgerService.recordRefund({
        id: payment.id,
        amount: amountToRefund,
        userId: order.user.id,
        orderId: order.id,
      });

      await tx.activityLog.create({
        data: {
          userId: 'ADMIN',
          action: 'REFUND_ISSUED',
          target: id,
          metadata: {
            amount: amountToRefund,
            reason: reason || 'Refund processed',
            isGroupRefund: !!order.orderGroupId,
          },
        },
      });
    });
  }

  // ===========================================================================
  // 6. FORCE STATUS OVERRIDE
  // ===========================================================================
  async forceStatusChange(
    orderId: string,
    newStatus: OrderStatus,
    reason: string,
    adminId: string,
  ) {
    // Check if it's an OrderGroup ID
    const group = await this.prisma.orderGroup.findUnique({
      where: { id: orderId },
      include: { orders: true },
    });

    if (group) {
      await this.prisma.$transaction(
        group.orders.map((o) =>
          this.prisma.order.update({
            where: { id: o.id },
            data: {
              status: newStatus,
              cancelledAt: newStatus === 'CANCELLED' ? new Date() : undefined,
              deliveredAt: newStatus === 'DELIVERED' ? new Date() : undefined,
            },
          }),
        ),
      );

      await this.prisma.activityLog.create({
        data: {
          userId: adminId,
          action: 'ORDER_GROUP_FORCE_UPDATE',
          details: `Force status change for GROUP ${orderId} to ${newStatus}. Reason: ${reason}`,
          target: orderId,
          metadata: { newStatus, reason, orderCount: group.orders.length },
        },
      });

      return { message: `Updated ${group.orders.length} orders in group` };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });
    if (!order) throw new NotFoundException('Order not found');

    const updatedOrder = await this.prisma.order.update({
      where: { id: orderId },
      data: {
        status: newStatus,
        cancelledAt: newStatus === 'CANCELLED' ? new Date() : undefined,
        deliveredAt: newStatus === 'DELIVERED' ? new Date() : undefined,
        ...(['PENDING', 'PREPARING', 'CONFIRMED'].includes(newStatus) && {
          deliveredAt: null,
          cancelledAt: null,
        }),
      },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'ORDER_FORCE_UPDATE',
        details: `Force status change from ${order.status} to ${newStatus}. Reason: ${reason}`,
        target: orderId,
        metadata: { oldStatus: order.status, newStatus, reason },
      },
    });

    return updatedOrder;
  }

  // ===========================================================================
  // 7. ADMIN-MANAGED STORE ORDER ACTIONS
  //    These mirror VendorOrdersService but skip vendor-ownership checks
  // ===========================================================================

  /** Fetch orders for a specific store (admin view, with full details) */
  async getStoreOrders(storeId: string, status?: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    // Build status filter
    const whereClause: Prisma.OrderWhereInput = { storeId };
    let statuses: OrderStatus[] = [];
    if (status && status !== 'all') {
      statuses = status
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is OrderStatus =>
          Object.values(OrderStatus).includes(s as OrderStatus),
        );
      if (statuses.length === 1) whereClause.status = statuses[0];
      else if (statuses.length > 1) whereClause.status = { in: statuses };
    }

    // Step 1 ΓÇö get IDs in priority order via raw SQL.
    // Status priority: PENDING (needs immediate action) ΓåÆ CONFIRMED ΓåÆ PREPARING
    // ΓåÆ READY ΓåÆ all others ΓåÆ CANCELLED/DECLINED (no action needed).
    // Secondary sort: most recent first.
    const statusFilter =
      statuses.length > 0
        ? Prisma.sql`AND o.status = ANY(ARRAY[${Prisma.join(statuses)}]::"OrderStatus"[])`
        : Prisma.sql``;

    const [orderedRows, total] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT o.id FROM "Order" o
          WHERE o."storeId" = ${storeId}
          ${statusFilter}
          ORDER BY
            CASE o.status::text
              WHEN 'PENDING'   THEN 1
              WHEN 'CONFIRMED' THEN 2
              WHEN 'PREPARING' THEN 3
              WHEN 'READY'     THEN 4
              WHEN 'CANCELLED' THEN 6
              WHEN 'DECLINED'  THEN 6
              ELSE                  5
            END ASC,
            o."createdAt" DESC
          LIMIT ${Prisma.raw(String(limit))} OFFSET ${Prisma.raw(String(skip))}
        `,
      ),
      this.prisma.order.count({ where: whereClause }),
    ]);

    // Step 2 ΓÇö fetch full records with all includes for the page's IDs.
    const ids = orderedRows.map((r) => r.id);
    if (ids.length === 0) {
      return {
        data: [],
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
      };
    }
    const unordered = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      include: {
        items: { include: { modifiers: { include: { modifier: true } } } },
        user: { select: { name: true, phone: true, image: true } },
        delivery: { select: { status: true, riderId: true } },
        payment: { select: { status: true } },
        orderGroup: { include: { payment: { select: { status: true } } } },
      },
    });

    // Restore the priority order returned by the raw query.
    const idIndex = new Map(ids.map((id, i) => [id, i]));
    const data = unordered.sort(
      (a, b) => (idIndex.get(a.id) ?? 0) - (idIndex.get(b.id) ?? 0),
    );

    return {
      data: data.map((order) => {
        const payment = order.payment || order.orderGroup?.payment;
        return {
          ...order,
          totalAmount: order.total,
          paymentStatus: payment?.status ?? 'UNPAID',
          items: order.items.map((item) => ({
            ...item,
            productName: item.nameSnap,
            modifierGroups: item.modifiers?.length
              ? [
                  {
                    id: 'default-group',
                    name: 'Selected Options',
                    modifiers: item.modifiers.map((m) => ({
                      id: m.modifier.id,
                      name: m.modifier.name,
                      price: m.modifier.price,
                    })),
                  },
                ]
              : [],
            modifiers: undefined,
          })),
        };
      }),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  /** Get all orders across ALL admin-managed stores */
  async getAllAdminManagedOrders(
    storeId?: string,
    status?: string,
    page = 1,
    limit = 20,
  ) {
    const skip = (page - 1) * limit;

    // Build Prisma where clause (used for count and the includes fetch)
    const whereClause: Prisma.OrderWhereInput = {
      store: { isAdminManaged: true, ...(storeId ? { id: storeId } : {}) },
    };
    let statuses: OrderStatus[] = [];
    if (status && status !== 'all') {
      statuses = status
        .split(',')
        .map((s) => s.trim().toUpperCase())
        .filter((s): s is OrderStatus =>
          Object.values(OrderStatus).includes(s as OrderStatus),
        );
      if (statuses.length === 1) whereClause.status = statuses[0];
      else if (statuses.length > 1) whereClause.status = { in: statuses };
    }

    // Step 1 ΓÇö get page of IDs in status-priority + recency order via raw SQL.
    const statusFilter =
      statuses.length > 0
        ? Prisma.sql`AND o.status = ANY(ARRAY[${Prisma.join(statuses)}]::"OrderStatus"[])`
        : Prisma.sql``;
    const storeFilter = storeId
      ? Prisma.sql`AND s.id = ${storeId}`
      : Prisma.sql``;

    const [orderedRows, total, managedStores] = await Promise.all([
      this.prisma.$queryRaw<{ id: string }[]>(
        Prisma.sql`
          SELECT o.id FROM "Order" o
          JOIN "Store" s ON s.id = o."storeId"
          WHERE s."isAdminManaged" = true
          ${storeFilter}
          ${statusFilter}
          ORDER BY
            CASE o.status::text
              WHEN 'PENDING'   THEN 1
              WHEN 'CONFIRMED' THEN 2
              WHEN 'PREPARING' THEN 3
              WHEN 'READY'     THEN 4
              WHEN 'CANCELLED' THEN 6
              WHEN 'DECLINED'  THEN 6
              ELSE                  5
            END ASC,
            o."createdAt" DESC
          LIMIT ${Prisma.raw(String(limit))} OFFSET ${Prisma.raw(String(skip))}
        `,
      ),
      this.prisma.order.count({ where: whereClause }),
      this.prisma.store.findMany({
        where: { isAdminManaged: true },
        select: { id: true, name: true, logo: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Step 2 ΓÇö fetch full records with includes for the page's IDs.
    const ids = orderedRows.map((r) => r.id);
    if (ids.length === 0) {
      return {
        data: [],
        meta: { total, page, limit, pages: Math.ceil(total / limit) },
        managedStores,
      };
    }
    const unordered = await this.prisma.order.findMany({
      where: { id: { in: ids } },
      include: {
        store: {
          select: { id: true, name: true, logo: true, isAdminManaged: true },
        },
        items: { include: { modifiers: { include: { modifier: true } } } },
        user: { select: { name: true, phone: true, image: true } },
        delivery: { select: { status: true, riderId: true } },
        payment: { select: { status: true } },
        orderGroup: { include: { payment: { select: { status: true } } } },
      },
    });

    // Restore the priority order from the raw query.
    const idIndex = new Map(ids.map((id, i) => [id, i]));
    const data = unordered.sort(
      (a, b) => (idIndex.get(a.id) ?? 0) - (idIndex.get(b.id) ?? 0),
    );

    return {
      data: data.map((order) => {
        const payment = order.payment || order.orderGroup?.payment;
        return {
          ...order,
          totalAmount: order.total,
          paymentStatus: payment?.status ?? 'UNPAID',
          items: order.items.map((item) => ({
            ...item,
            productName: item.nameSnap,
            modifierGroups: item.modifiers?.length
              ? [
                  {
                    id: 'default-group',
                    name: 'Selected Options',
                    modifiers: item.modifiers.map((m) => ({
                      id: m.modifier.id,
                      name: m.modifier.name,
                      price: m.modifier.price,
                    })),
                  },
                ]
              : [],
            modifiers: undefined,
          })),
        };
      }),
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
      managedStores,
    };
  }

  /** Admin accepts a store order (PENDING ΓåÆ CONFIRMED) */
  async adminAcceptOrder(orderId: string, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { isAdminManaged: true, name: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.store.isAdminManaged)
      throw new BadRequestException('Store is not in admin-managed mode');
    if (order.status !== 'PENDING')
      throw new BadRequestException(
        `Cannot accept order in ${order.status} status`,
      );

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_ORDER_ACCEPTED',
        target: orderId,
        details: `Admin accepted order for store: ${order.store.name}`,
      },
    });

    return updated;
  }

  /** Admin declines a store order (PENDING ΓåÆ REJECTED) */
  async adminDeclineOrder(orderId: string, adminId: string, reason: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { isAdminManaged: true, name: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.store.isAdminManaged)
      throw new BadRequestException('Store is not in admin-managed mode');
    if (order.status !== 'PENDING')
      throw new BadRequestException('Can only decline PENDING orders');

    const updated = await this.prisma.$transaction(async (tx) => {
      const u = await tx.order.update({
        where: { id: orderId },
        data: { status: OrderStatus.REJECTED, cancelledAt: new Date() },
        include: { items: true },
      });

      // Restore stock
      await this.inventoryService.atomicIncrementStock(tx, u.items);
      return u;
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_ORDER_DECLINED',
        target: orderId,
        details: reason || 'Admin declined order',
      },
    });

    return updated;
  }

  /** Admin marks order as preparing (CONFIRMED ΓåÆ PREPARING) */
  async adminStartPreparing(orderId: string, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { isAdminManaged: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.store.isAdminManaged)
      throw new BadRequestException('Store is not in admin-managed mode');
    if (order.status !== 'CONFIRMED')
      throw new BadRequestException('Order must be CONFIRMED before preparing');

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PREPARING },
    });

    await this.prisma.activityLog.create({
      data: {
        userId: adminId,
        action: 'ADMIN_ORDER_PREPARING',
        target: orderId,
      },
    });

    return updated;
  }

  /** Admin marks order as ready (CONFIRMED|PREPARING ΓåÆ READY) */
  async adminMarkReady(orderId: string, adminId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: { store: { select: { isAdminManaged: true } } },
    });
    if (!order) throw new NotFoundException('Order not found');
    if (!order.store.isAdminManaged)
      throw new BadRequestException('Store is not in admin-managed mode');
    if (
      !([OrderStatus.PREPARING, OrderStatus.CONFIRMED] as string[]).includes(
        order.status,
      )
    ) {
      throw new BadRequestException(
        'Order must be Confirmed or Preparing to mark as Ready',
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.READY },
    });

    this.eventEmitter.emit('order.ready', {
      orderId: updated.id,
      storeId: updated.storeId,
    });

    await this.prisma.activityLog.create({
      data: { userId: adminId, action: 'ADMIN_ORDER_READY', target: orderId },
    });

    return updated;
  }

  // --- Transformers ---
  private deriveGroupStatus(orders: any[]): string {
    const STATUS_PRIORITY = [
      'PENDING',
      'CONFIRMED',
      'PREPARING',
      'READY',
      'DISPATCHED',
      'DELIVERED',
      'CANCELLED',
      'REJECTED',
    ];
    const statuses = orders.map((o) => o.status as string);
    for (const s of STATUS_PRIORITY) {
      if (statuses.includes(s)) return s;
    }
    return statuses[0] || 'PENDING';
  }

  private mapStoreTypeToService(type: string) {
    const entry = Object.entries(SERVICE_TYPE_MAP).find(([k, v]) => v === type);
    return entry ? entry[0] : type;
  }

  private transformForDetail(order: any, logs: any[], dispute: any) {
    const payment = order.payment || order.orderGroup?.payment;

    // ✅ FIX: If this is part of a group, we return the main order but also
    // include the "Group context" (all sister orders) so the Admin can see
    // the whole fulfillment status across vendors.
    const groupOrders = order.orderGroup?.orders || [];

    return {
      id: order.id,
      groupId: order.orderGroupId,
      deliveryId: order.delivery?.id ?? order.orderGroup?.delivery?.id ?? null,
      serviceType: this.mapStoreTypeToService(order.store.type),
      status: order.status,
      groupStatus: order.orderGroup ? this.deriveGroupStatus(groupOrders) : order.status,
      dispute,
      amount: order.total,
      updatedAt: order.updatedAt,
      isLate:
        ['PREPARING', 'PENDING'].includes(order.status) &&
        new Date().getTime() - new Date(order.createdAt).getTime() > 45 * 60000,

      customer: {
        name: order.user.name,
        phone: order.delivery?.recipientPhone || order.user.phone || 'N/A',
        email: order.user.email,
        address:
          order.delivery?.dropoffAddress?.street ||
          order.orderGroup?.delivery?.dropoffAddress?.street ||
          'N/A',
      },

      vendor: {
        name: order.store.name,
        address: order.store.address,
        ownerName: order.store.vendor?.name || 'N/A',
        ownerPhone: order.store.vendor?.phone || 'N/A',
      },

      // ✅ Include Sister Orders for the UI to traverse
      subOrders: groupOrders.map((o) => ({
        id: o.id,
        storeName: o.store.name,
        status: o.status,
        amount: o.total,
        items: o.items.map((i) => ({
          name: i.nameSnap,
          quantity: i.quantity,
          price: i.price,
          options: i.selectedOptions,
          modifiers: i.modifiers?.map((m) => ({ name: m.modifier.name, price: m.modifier.price })) || [],
        })),
        delivery: o.delivery,
      })),

      rider: order.delivery?.rider
        ? {
            name: order.delivery.rider.name,
            phone: order.delivery.rider.phone,
            vehicle: order.delivery.rider.vehicle?.plateNumber,
          }
        : null,

      items: order.items.map((item: any) => ({
        name: item.nameSnap,
        quantity: item.quantity,
        price: item.price,
        options: item.selectedOptions,
        modifiers:
          item.modifiers?.map((m: any) => ({
            name: m.modifier ? m.modifier.name : m.name,
            price: m.modifier ? m.modifier.price : m.price,
          })) || [],
        product: item.product,
      })),

      payment: payment
        ? {
            status: payment.status,
            method: payment.method,
            total: payment.amount,
            isGroupPayment: !!order.orderGroupId,
          }
        : null,

      logs: logs.map((log: any) => ({
        date: log.createdAt,
        user: log.user?.name || 'System',
        action: log.action,
        details:
          log.details || (log.metadata ? JSON.stringify(log.metadata) : ''),
      })),
    };
  }
}
