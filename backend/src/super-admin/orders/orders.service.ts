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
  ) {}

  // ===========================================================================
  // 1. LIST ORDERS (Fixed for Multi-Vendor)
  // ===========================================================================
  async findAll(query: OrderFilterDto) {
    const { search, status, type, from, to, page = 1, limit = 10 } = query;
    const skip = (Number(page) - 1) * Number(limit);

    const storeType =
      type && type !== 'All' ? SERVICE_TYPE_MAP[type] : undefined;

    const where: Prisma.OrderWhereInput = {
      // Only show paid orders in the admin dashboard
      paymentStatus: 'PAID',
      ...(search && {
        OR: [
          { id: { contains: search, mode: 'insensitive' } },
          { user: { name: { contains: search, mode: 'insensitive' } } },
          { store: { name: { contains: search, mode: 'insensitive' } } },
          // Added: Search by OrderGroup ID
          { orderGroupId: { contains: search, mode: 'insensitive' } },
        ],
      }),
      ...(status &&
        status !== 'All' && {
          status: status as Prisma.EnumOrderStatusFilter,
        }),
      ...(storeType && {
        store: { type: storeType },
      }),
      ...((from || to) && {
        createdAt: {
          ...(from && { gte: new Date(new Date(from).setHours(0, 0, 0, 0)) }),
          ...(to && { lte: new Date(new Date(to).setHours(23, 59, 59, 999)) }),
        },
      }),
    };

    const [orders, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: Number(limit),
        orderBy: { createdAt: 'desc' },
        include: {
          user: { select: { name: true } },
          store: { select: { name: true, type: true } },
          // Γ£à FIX: Include Direct Payment AND Group Payment
          payment: { select: { status: true, amount: true, method: true } },
          orderGroup: {
            include: {
              payment: { select: { status: true, amount: true, method: true } },
            },
          },
          delivery: {
            include: { rider: { select: { name: true } } },
          },
        },
      }),
      this.prisma.order.count({ where }),
    ]);

    return {
      data: orders.map((order) => {
        // Resolve Payment Source
        const payment = order.payment || order.orderGroup?.payment;

        return {
          id: order.id,
          groupId: order.orderGroupId, // Expose Group ID
          status: order.status,
          customer: order.user.name,
          vendor: order.store.name,
          rider: order.delivery?.rider?.name ?? 'Unassigned',
          // Show Order Total, not Transaction Total
          amount: order.total,
          paymentStatus: payment?.status ?? 'UNPAID',
          type: this.mapStoreTypeToService(order.store.type),
          placedAt: order.createdAt.toISOString(),
        };
      }),
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        pages: Math.ceil(total / Number(limit)),
      },
    };
  }

  // ===========================================================================
  // 2. GET SINGLE ORDER (Fixed for Multi-Vendor)
  // ===========================================================================
  async findOne(id: string) {
    const order = await this.prisma.order.findUnique({
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
        // Γ£à FIX: Include Direct Payment AND Group Payment
        payment: true,
        orderGroup: {
          include: { payment: true },
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

    if (!order) throw new NotFoundException(`Order #${id} not found`);

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
      await tx.order.update({
        where: { id },
        data: { status: 'CANCELLED', cancelledAt: new Date() },
      });

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

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.REJECTED, cancelledAt: new Date() },
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
  private mapStoreTypeToService(type: string) {
    const entry = Object.entries(SERVICE_TYPE_MAP).find(([k, v]) => v === type);
    return entry ? entry[0] : type;
  }

  private transformForDetail(order: any, logs: any[], dispute: any) {
    // Resolve Payment for Transformer
    const payment = order.payment || order.orderGroup?.payment;

    return {
      id: order.id,
      groupId: order.orderGroupId, // Expose Group ID
      deliveryId: order.delivery?.id ?? null, // Expose Delivery ID for rider assignment
      serviceType: this.mapStoreTypeToService(order.store.type),
      status: order.status,
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
        address: order.delivery?.dropoffAddress?.street || 'N/A',
      },

      vendor: {
        name: order.store.name,
        address: order.store.address,
        ownerName: order.store.vendor?.name || 'N/A',
        ownerPhone: order.store.vendor?.phone || 'N/A',
      },

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
            name: m.name,
            price: m.price,
          })) || [],
        product: item.product,
      })),

      payment: payment
        ? {
            status: payment.status,
            method: payment.method,
            total: payment.amount, // Transaction Total (may be group total)
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
