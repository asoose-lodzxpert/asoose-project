import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Order, OrderStatus } from '@prisma/client';
import { CreateOrderDto, OrderItemDto } from './dto/users.dto';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { PricingService } from './pricing.service';
import { AddressesService } from './addresses.service';
import { NotificationFacade } from './notification.facade';
import type { RedisClientType } from 'redis';
import { InventoryService } from './inventory.service';
import { VendorOrdersStreamService } from '../vendor/orders/vendor-orders-stream.service';
import { NotificationsGateway } from '../notifications/notifications.gateway';
import { QueueService } from '../matching/queue/queue.service';
// ==================== CONSTANTS ====================

const ORDER_STATUS = { PENDING: 'PENDING' } as const;
const DELIVERY_STATUS = { REQUESTED: 'REQUESTED' } as const;

const IDEMPOTENCY_PREFIX = 'idemp:order:';

// CRITICAL CONFIG: Redis Lock TTL (30s) > DB Timeout (20s)
// This ensures the lock doesn't expire while the DB transaction is still committing.
const DB_TIMEOUT_MS = 20000;
const LOCK_TTL_MS = 30000;
const COMPLETED_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

const VALIDATION = {
  MAX_ITEMS_PER_ORDER: 50,
  MAX_QUANTITY_PER_ITEM: 100,
  MIN_QUANTITY: 1,
} as const;

const DEFAULT_ETA = '30-45 mins';
const DISTANCE_TIME_MULTIPLIER = 5; // minutes per km
const BASE_PREP_TIME = 15; // minutes

// ==================== TYPES ====================

interface PreparedStoreContext {
  storeId: string;
  store: any;
  pickupAddressId: string;
  distance: number;
  deliveryFee: number;
  serviceFee: number;
  finalTotal: number;
  orderItemsData: any[];
  groupItems: OrderItemDto[];
  emailItems: string[];
}

interface OrderNotificationContext {
  storeOwnerId: string;
  storeName: string;
  storeOwnerEmail: string;
  customerEmail: string;
  customerName: string;
}

interface OrderFilter {
  userId: string;
  status?: string;
}

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private prisma: PrismaService,
    private pricingService: PricingService,
    private addressesService: AddressesService,
    private notificationFacade: NotificationFacade,
    private inventoryService: InventoryService,
    private vendorOrdersStreamService: VendorOrdersStreamService,
    private notificationsGateway: NotificationsGateway,
    private queueService: QueueService, // Injected for Durable Handoff
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  // ==================== PUBLIC METHODS ====================

  /**
   * Calculate order quote without creating the order
   * Used for displaying pricing breakdown to users before order confirmation
   */
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  async calculateQuote(userId: string, data: CreateOrderDto) {
    try {
      if (!data.restaurantId) {
        throw new BadRequestException('Restaurant ID is required for a quote');
      }

      this.validateOrderItems(data.items);

      const { addressId, restaurantId, items } = data;

      // Parallel fetch for speed
      const [store, address] = await Promise.all([
        this.prisma.store.findUnique({
          where: { id: restaurantId },
          select: { lat: true, lng: true, name: true },
        }),
        this.prisma.address.findUnique({
          where: { id: addressId },
        }),
      ]);

      if (!store) {
        throw new NotFoundException('Store not found');
      }

      if (!address || address.userId !== userId) {
        throw new BadRequestException('Invalid delivery address');
      }

      // Fetch and validate products
      const productIds = items.map((i) => i.id);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
      });

      if (products.length !== items.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missingIds = productIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Products not found: ${missingIds.join(', ')}`,
        );
      }

      const productMap = new Map(products.map((p) => [p.id, p]));

      // Calculate subtotal
      let subtotal = 0;
      items.forEach((item) => {
        const product = productMap.get(item.id);
        if (product) {
          subtotal += product.price * item.quantity;
        }
      });

      // Calculate fees
      const storeLat = store.lat ?? 0;
      const storeLng = store.lng ?? 0;

      const distance = this.pricingService.calculateDistance(
        storeLat,
        storeLng,
        address.lat,
        address.lng,
      );

      const deliveryFee = this.pricingService.calculateDeliveryFee(distance);
      const serviceFee = this.pricingService.calculateServiceFee(subtotal);
      const total = subtotal + deliveryFee + serviceFee;

      return {
        subtotal,
        deliveryFee,
        serviceFee,
        total,
        distanceKm: parseFloat(distance.toFixed(2)),
        estimatedTime: this.calculateETA(distance),
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Quote calculation failed', error);
      throw new BadRequestException('Failed to calculate quote');
    }
  }

  /**
   * Calculate breakdown for multi-store orders
   */
  async calculateOrderBreakdown(userId: string, dto: CreateOrderDto) {
    try {
      this.validateOrderItems(dto.items);
      const { addressId, items } = dto;

      const dropoffAddress = await this.prisma.address.findUnique({
        where: { id: addressId },
      });

      if (!dropoffAddress || dropoffAddress.userId !== userId) {
        throw new BadRequestException('Invalid delivery address');
      }

      const productIds = items.map((i) => i.id);
      const products = await this.prisma.product.findMany({
        where: { id: { in: productIds } },
        include: { store: true },
      });

      if (products.length !== items.length) {
        const foundIds = new Set(products.map((p) => p.id));
        const missingIds = productIds.filter((id) => !foundIds.has(id));
        throw new BadRequestException(
          `Products not found: ${missingIds.join(', ')}`,
        );
      }

      const productMap = new Map(products.map((p) => [p.id, p]));
      const storeGroups = new Map<string, typeof items>();

      items.forEach((item) => {
        const product = productMap.get(item.id)!;
        const existing = storeGroups.get(product.storeId) || [];
        existing.push(item);
        storeGroups.set(product.storeId, existing);
      });

      const breakdown: Array<{
        storeName: string;
        storeId: string;
        items: any[];
        subtotal: number;
        deliveryFee: number;
        serviceFee: number;
        total: number;
      }> = [];

      let grandTotal = 0;
      let totalDeliveryFee = 0;

      for (const [storeId, groupItems] of storeGroups) {
        const firstProduct = productMap.get(groupItems[0].id)!;
        const store = firstProduct.store;

        const distance = this.pricingService.calculateDistance(
          store.lat ?? 0,
          store.lng ?? 0,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );

        const deliveryFee = this.pricingService.calculateDeliveryFee(distance);

        let subtotal = 0;
        const enrichedItems = groupItems.map((item) => {
          const p = productMap.get(item.id)!;
          subtotal += p.price * item.quantity;
          return {
            ...item,
            name: p.name,
            price: p.price,
          };
        });

        const serviceFee = this.pricingService.calculateServiceFee(subtotal);
        const storeTotal = subtotal + deliveryFee + serviceFee;

        breakdown.push({
          storeName: store.name,
          storeId: store.id,
          items: enrichedItems,
          subtotal,
          deliveryFee,
          serviceFee,
          total: storeTotal,
        });

        grandTotal += storeTotal;
        totalDeliveryFee += deliveryFee;
      }

      return {
        groups: breakdown,
        totalDeliveryFee,
        grandTotal,
        currency: 'NGN',
      };
    } catch (error) {
      if (
        error instanceof NotFoundException ||
        error instanceof BadRequestException
      ) {
        throw error;
      }
      this.logger.error('Breakdown calculation failed', error);
      throw new BadRequestException('Failed to calculate order breakdown');
    }
  }

  /**
   * Create a single order (Fixed Architecture)
   */
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createOrder(
    userId: string,
    data: CreateOrderDto,
    idempotencyHeader?: string,
  ) {
    const redisKey = this.generateIdempotencyKey(
      userId,
      data,
      idempotencyHeader,
    );

    // 1. Idempotency Check
    const existingResult = await this.checkIdempotency(redisKey);
    if (existingResult) {
      // Return existing order shape
      return this.prisma.order.findUnique({
        where: { id: existingResult.orderId || existingResult },
        include: { user: true, store: true },
      });
    }

    try {
      this.validateOrderItems(data.items);
      if (!data.restaurantId)
        throw new BadRequestException(
          'Restaurant ID required for single order',
        );

      // 2. Prepare Context (Outside Transaction)
      // This fetches data, resolves addresses, and calculates prices efficiently
      const context = await this.prepareOrderContext(userId, data);

      // 3. Execute Transaction (Atomic Stock + Create)
      const order = await this.prisma.$transaction(
        async (tx) => {
          // Atomic Stock Update (Prevents race conditions)
          await this.atomicStockDecrement(
            tx,
            context.preparedStores[0].groupItems,
          );

          // Create Order
          const prep = context.preparedStores[0];
          return tx.order.create({
            data: {
              userId,
              storeId: prep.storeId,
              total: prep.finalTotal,
              status: ORDER_STATUS.PENDING,
              items: { create: prep.orderItemsData },
              delivery: {
                create: {
                  customerId: userId,
                  pickupAddressId: prep.pickupAddressId,
                  dropoffAddressId: data.addressId,
                  status: DELIVERY_STATUS.REQUESTED,
                  deliveryFee: prep.deliveryFee,
                  distanceKm: parseFloat(prep.distance.toFixed(2)),
                  recipientName: context.user.name,
                  recipientPhone: context.user.phone || 'N/A',
                },
              },
            },
            include: { user: true, store: true },
          });
        },
        {
          timeout: DB_TIMEOUT_MS,
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );

      // 4. Durable Handoff
      await this.completeIdempotency(redisKey, { orderId: order.id });

      // Async Notification (Safe)
      this.handoffNotifications(order, context.preparedStores[0].emailItems);

      // ✅ Broadcast new order to admin dashboard in real-time
      this.notificationsGateway.sendToAdminRoom({
        id: order.id,
        type: 'ORDER',
        category: 'ORDER_CREATED',
        title: 'New Order Placed',
        message: `₦${order.total} order from ${order.user?.name || 'Customer'} at ${order.store?.name}`,
        isRead: false,
        createdAt: new Date().toISOString(),
        metadata: { orderId: order.id },
        recipientName: order.user?.name || '—',
      });

      return order;
    } catch (error) {
      await this.releaseIdempotencyLock(redisKey);
      this.handleOrderError(userId, error);
    }
  }

  /**
   * Create Multi-Order (Fixed Architecture)
   * Parallel execution, Atomic Stock, No Deadlocks.
   */
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  async createMultiOrder(
    userId: string,
    dto: CreateOrderDto,
    idempotencyHeader?: string,
  ) {
    const redisKey = this.generateIdempotencyKey(
      userId,
      dto,
      idempotencyHeader,
    );

    // 1. Idempotency Guard
    const existingResult = await this.checkIdempotency(redisKey);
    if (existingResult) {
      // Hydrate the existing result if needed or return mapped response
      return existingResult;
    }

    try {
      this.validateOrderItems(dto.items);

      // 2. Phase 1: Preparation (Parallel I/O, No Locks)
      // Resolves addresses, prices, and groups items BEFORE opening DB transaction
      const { user, preparedStores, calculatedGrandTotal } =
        await this.prepareOrderContext(userId, dto);

      // 3. Phase 2: Execution (Strict Transaction)
      // Uses ReadCommitted + Atomic Updates to avoid deadlocks vs Serializable
      const result = await this.prisma.$transaction(
        async (tx) => {
          // A. Create Group
          const orderGroup = await tx.orderGroup.create({
            data: {
              userId,
              totalAmount: calculatedGrandTotal,
              paymentStatus: 'PENDING',
            },
          });

          // B. Execute Stores in Parallel (Promise.all)
          // This ensures we don't hold locks sequentially for long periods
          const orders = await Promise.all(
            preparedStores.map(async (prep) => {
              // 1. Atomic Stock Decrement (The Guard)
              await this.atomicStockDecrement(tx, prep.groupItems);

              // 2. Create Order
              return tx.order.create({
                data: {
                  userId,
                  storeId: prep.storeId,
                  orderGroupId: orderGroup.id,
                  total: prep.finalTotal,
                  status: ORDER_STATUS.PENDING,
                  items: { create: prep.orderItemsData },
                  delivery: {
                    create: {
                      customerId: userId,
                      pickupAddressId: prep.pickupAddressId,
                      dropoffAddressId: dto.addressId,
                      status: DELIVERY_STATUS.REQUESTED,
                      deliveryFee: prep.deliveryFee,
                      distanceKm: parseFloat(prep.distance.toFixed(2)),
                      recipientName: user.name,
                      recipientPhone: user.phone || 'N/A',
                    },
                  },
                },
                include: { store: { include: { vendor: true } }, user: true },
              });
            }),
          );

          return { group: orderGroup, orders };
        },
        {
          timeout: DB_TIMEOUT_MS, // 20s
          isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted,
        },
      );

      // 4. Phase 3: Durable Handoff
      const responsePayload = {
        message: 'Orders placed successfully',
        orderGroupId: result.group.id,
        orders: result.orders,
        totalCount: result.orders.length,
        grandTotal: result.group.totalAmount,
      };

      await this.completeIdempotency(redisKey, responsePayload);

      // Async Notification Handoff
      this.handoffMultiNotifications(result.orders, preparedStores);

      // ✅ Broadcast each order to admin dashboard in real-time
      result.orders.forEach((order) => {
        this.notificationsGateway.sendToAdminRoom({
          id: order.id,
          type: 'ORDER',
          category: 'ORDER_CREATED',
          title: 'New Order Placed',
          message: `₦${order.total} order from ${order.user?.name || 'Customer'} at ${order.store?.name}`,
          isRead: false,
          createdAt: new Date().toISOString(),
          metadata: { orderId: order.id },
          recipientName: order.user?.name || '—',
        });
      });

      return responsePayload;
    } catch (error) {
      await this.releaseIdempotencyLock(redisKey);
      this.handleOrderError(userId, error);
    }
  }

  /**
   * Get paginated list of user's orders
   */
  async getUserOrders(
    userId: string,
    opts?: { page?: number; pageSize?: number; status?: string },
  ) {
    try {
      const page = opts?.page || 1;
      const pageSize = opts?.pageSize || 10;

      // ✅ FIX 1: Use Prisma's native input type, not a custom interface
      const where: Prisma.OrderWhereInput = { userId };

      if (opts?.status) {
        // ✅ FIX 2: Cast the string to the correct Enum type
        where.status = opts.status as OrderStatus;
      }

      const [orders, total] = await this.prisma.$transaction([
        this.prisma.order.findMany({
          where,
          orderBy: { createdAt: 'desc' },
          include: {
            items: { select: { quantity: true, nameSnap: true } },
            store: { select: { name: true, logo: true } },
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.order.count({ where }),
      ]);

      return {
        data: orders.map((order) => ({
          id: order.id,
          status: order.status,
          total: order.total,
          createdAt: order.createdAt,
          // ✅ TypeScript now knows 'store' exists because the query is valid
          storeName: order.store?.name,
          storeLogo: order.store?.logo,
          items: order.items?.map((i) => ({
            name: i.nameSnap,
            quantity: i.quantity,
          })),
        })),
        total,
        page,
        pageSize,
        hasMore: page * pageSize < total,
      };
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch orders for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to retrieve orders');
    }
  }

  /**
   * Get detailed information about a specific order
   */
  async getOrderDetails(userId: string, orderId: string) {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, userId: userId },
        include: {
          items: true,
          delivery: {
            include: {
              dropoffAddress: true,
              rider: {
                select: {
                  name: true,
                  phone: true,
                  image: true,
                  vehicle: {
                    select: { model: true, color: true, plateNumber: true },
                  },
                },
              },
            },
          },
          store: {
            select: {
              name: true,
              lat: true,
              lng: true,
              vendor: { select: { phone: true } },
            },
          },
          disputes: { select: { id: true, status: true } },
        },
      });

      if (!order) {
        throw new NotFoundException('Order not found');
      }

      const timeline = this.buildOrderTimeline(order);

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        eta: this.calculateOrderETA(order),
        distance: order.delivery?.distanceKm
          ? `${order.delivery.distanceKm} km`
          : null,
        timeline: timeline,
        rider: this.formatRiderInfo(order.delivery?.rider),
        dispute: order.disputes[0] || null,
        items: order.items.map((item) => ({
          id: item.id,
          name: item.nameSnap,
          price: item.price,
          quantity: item.quantity,
        })),
        addressDetails: order.delivery?.dropoffAddress
          ? {
              address: order.delivery.dropoffAddress.street,
              city: order.delivery.dropoffAddress.city,
            }
          : null,
        store: {
          name: order.store?.name,
          phone: order.store?.vendor?.phone,
          location: { lat: order.store?.lat, lng: order.store?.lng },
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) {
        throw error;
      }
      this.logger.error('Failed to retrieve order details', error);
      throw new BadRequestException('Failed to retrieve order details');
    }
  }

  // ==================== HELPER: CONTEXT PREPARATION ====================

  private async prepareOrderContext(userId: string, dto: CreateOrderDto) {
    // Parallel Fetching
    const [user, dropoffAddress] = await Promise.all([
      this.prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, name: true, phone: true },
      }),
      this.prisma.address.findUnique({ where: { id: dto.addressId } }),
    ]);

    if (!user) throw new NotFoundException('User not found');
    if (!dropoffAddress || dropoffAddress.userId !== userId)
      throw new BadRequestException('Invalid delivery address');

    // Fetch Products
    const productIds = dto.items.map((i) => i.id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
      include: { store: { include: { vendor: true } } },
    });

    if (products.length !== dto.items.length)
      throw new BadRequestException('Products mismatch');

    const productMap = new Map(products.map((p) => [p.id, p]));
    const storeGroups = new Map<string, OrderItemDto[]>();

    // Grouping
    dto.items.forEach((item) => {
      const p = productMap.get(item.id)!;
      const existing = storeGroups.get(p.storeId) || [];
      existing.push(item);
      storeGroups.set(p.storeId, existing);
    });

    let calculatedGrandTotal = 0;

    // Parallel Calculations & Address Resolution (OUTSIDE TX)
    const preparedStores: PreparedStoreContext[] = await Promise.all(
      Array.from(storeGroups.entries()).map(async ([storeId, groupItems]) => {
        const firstProduct = productMap.get(groupItems[0].id)!;
        const store = firstProduct.store;

        // Resolve Address here to avoid DB lock contention later
        const pickupAddress =
          await this.addressesService.getOrCreateStoreAddress(
            store.vendorId,
            store.address || 'Unknown',
            store.lat || 0,
            store.lng || 0,
            this.prisma,
          );

        const distance = this.pricingService.calculateDistance(
          pickupAddress.lat,
          pickupAddress.lng,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );
        const deliveryFee = this.pricingService.calculateDeliveryFee(distance);

        let itemsTotal = 0;
        const orderItemsData = groupItems.map((item) => {
          const p = productMap.get(item.id)!;
          itemsTotal += p.price * item.quantity;
          return {
            productId: p.id,
            nameSnap: this.addressesService.sanitizeString(p.name),
            price: p.price,
            quantity: item.quantity,
          };
        });

        const serviceFee = this.pricingService.calculateServiceFee(itemsTotal);
        const finalTotal = itemsTotal + deliveryFee + serviceFee;
        calculatedGrandTotal += finalTotal;

        return {
          storeId,
          store,
          pickupAddressId: pickupAddress.id,
          distance,
          deliveryFee,
          serviceFee,
          finalTotal,
          orderItemsData,
          groupItems,
          emailItems: groupItems.map(
            (i) => `${i.quantity}x ${productMap.get(i.id)?.name}`,
          ),
        };
      }),
    );

    return { user, preparedStores, calculatedGrandTotal };
  }

  // ==================== HELPER: ATOMIC STOCK ====================

  /**
   * Atomically decrements stock using UpdateMany with 'gte' clause.
   * This guarantees no overselling without needing Serializable isolation.
   */
  private async atomicStockDecrement(
    tx: Prisma.TransactionClient,
    items: OrderItemDto[],
  ) {
    // Sort items to prevent Deadlocks between concurrent orders with same items
    const sortedItems = [...items].sort((a, b) => a.id.localeCompare(b.id));

    for (const item of sortedItems) {
      const result = await tx.product.updateMany({
        where: {
          id: item.id,
          stock: { gte: item.quantity }, // The Guard
        },
        data: {
          stock: { decrement: item.quantity },
        },
      });

      if (result.count === 0) {
        // Since we checked existence in Prepare phase, count=0 means Insufficient Stock
        throw new BadRequestException(
          `Insufficient stock for product ID: ${item.id}`,
        );
      }
    }
  }

  // ==================== HELPER: NOTIFICATIONS (DURABLE) ====================

  private async handoffNotifications(order: any, emailItems: string[]) {
    try {
      // 1. Push to Durable Queue (Reliability)
      await this.queueService.enqueueOrderNotification({
        orderId: order.id,
        userId: order.userId,
        type: 'SINGLE_ORDER',
      });

      // 2. Optimistic Updates (Speed)
      const context: OrderNotificationContext = {
        storeOwnerId: order.store.vendorId,
        storeName: order.store.name,
        storeOwnerEmail: order.store.vendor?.email,
        customerEmail: order.user.email,
        customerName: order.user.name,
      };

      this.sendOrderNotifications(order, context, emailItems as any).catch(
        (e) => this.logger.error(`Optimistic notification failed`, e),
      );
    } catch (e) {
      this.logger.error(
        `Failed to enqueue notification for order ${order.id}`,
        e,
      );
    }
  }

  private async handoffMultiNotifications(
    orders: any[],
    prepared: PreparedStoreContext[],
  ) {
    try {
      // Bulk Enqueue
      const jobs = orders.map((o) => ({
        name: 'order.notifications',
        data: { orderId: o.id, userId: o.userId, type: 'MULTI_ORDER' },
      }));

      await this.queueService.enqueueOrderNotificationBulk(jobs);

      // Optimistic UI updates
      orders.forEach((order, idx) => {
        const prep = prepared[idx];
        const context: OrderNotificationContext = {
          storeOwnerId: prep.store.vendorId,
          storeName: prep.store.name,
          storeOwnerEmail: prep.store.vendor?.email,
          customerEmail: order.user.email,
          customerName: order.user.name,
        };
        this.sendOrderNotifications(
          order,
          context,
          prep.emailItems as any,
        ).catch((e) =>
          this.logger.error(`Optimistic multi-notification failed`, e),
        );
      });
    } catch (e) {
      this.logger.error(`Failed to enqueue multi-order notifications`, e);
    }
  }

  private async sendOrderNotifications(
    order: any,
    context: OrderNotificationContext,
    items: any[],
  ) {
    await Promise.all([
      this.vendorOrdersStreamService.emitNewOrder(
        order.storeId,
        order.id,
        {
          id: order.id,
          status: order.status,
          total: order.total,
          customerName: context.customerName,
          customerEmail: context.customerEmail,
          storeName: context.storeName,
          itemCount: items.length,
          createdAt: order.createdAt,
        },
        context.storeOwnerId,
      ),
      this.notificationFacade.sendOrderNotifications(
        order.userId,
        context.storeOwnerId,
        order.id,
        context.storeName,
        order.total,
        context.customerEmail,
        context.storeOwnerEmail,
        items,
      ),
      this.notificationsGateway.sendOrderUpdate(order.id, {
        status: order.status,
        total: order.total,
        timeline: [
          {
            status: 'PLACED',
            label: 'Order Placed',
            time: order.createdAt.toISOString(),
            icon: 'default',
          },
        ],
      }),
    ]);
  }

  // ==================== HELPER: IDEMPOTENCY & VALIDATION ====================

  private generateIdempotencyKey(
    userId: string,
    data: CreateOrderDto,
    clientKey?: string,
  ): string {
    if (clientKey) return `header:${userId}:${clientKey}`;
    const { addressId, restaurantId, items } = data;
    const itemsString = items
      .map((i) => `${i.id}:${i.quantity}`)
      .sort()
      .join('|');
    const storeKey = restaurantId || 'multi';
    const rawData = `${userId}:${addressId}:${storeKey}:${itemsString}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }

  private async checkIdempotency(key: string) {
    const val = await this.redis.get(`${IDEMPOTENCY_PREFIX}${key}`);
    if (val) {
      if (val === 'PROCESSING')
        throw new ConflictException(
          'Order is currently processing. Please wait.',
        );
      // Return cached result
      return JSON.parse(val);
    }
    // Set PROCESSING lock with correct TTL
    const set = await this.redis.set(
      `${IDEMPOTENCY_PREFIX}${key}`,
      'PROCESSING',
      { PX: LOCK_TTL_MS, NX: true },
    );
    if (!set)
      throw new ConflictException(
        'Concurrent order attempt detected. Please wait.',
      );
    return null;
  }

  private async completeIdempotency(key: string, result: any) {
    await this.redis.set(
      `${IDEMPOTENCY_PREFIX}${key}`,
      JSON.stringify(result),
      { PX: COMPLETED_TTL_MS },
    );
  }

  private async releaseIdempotencyLock(key: string) {
    await this.redis.del(`${IDEMPOTENCY_PREFIX}${key}`);
  }

  private validateOrderItems(items: OrderItemDto[]) {
    if (!items?.length)
      throw new BadRequestException('Order must contain at least one item');
    if (items.length > VALIDATION.MAX_ITEMS_PER_ORDER)
      throw new BadRequestException(
        `Maximum ${VALIDATION.MAX_ITEMS_PER_ORDER} items per order`,
      );

    const seen = new Set();
    items.forEach((item, index) => {
      if (!item.id || !item.quantity)
        throw new BadRequestException(`Invalid item at position ${index + 1}`);
      if (item.quantity < VALIDATION.MIN_QUANTITY)
        throw new BadRequestException(
          `Minimum quantity is ${VALIDATION.MIN_QUANTITY}`,
        );
      if (item.quantity > VALIDATION.MAX_QUANTITY_PER_ITEM)
        throw new BadRequestException(
          `Maximum ${VALIDATION.MAX_QUANTITY_PER_ITEM} quantity per item`,
        );
      if (seen.has(item.id))
        throw new BadRequestException(`Duplicate item detected: ${item.id}`);
      seen.add(item.id);
    });
  }

  private handleOrderError(userId: string, error: any): never {
    this.logger.error(`Order Error [${userId}]: ${error.message}`, error.stack);
    if (
      error instanceof NotFoundException ||
      error instanceof BadRequestException ||
      error instanceof ConflictException
    ) {
      throw error;
    }
    if (error.code === 'P2002') {
      throw new ConflictException('Duplicate order detected');
    }
    throw new BadRequestException('Order creation failed');
  }

  // ==================== HELPER: UI / FORMATTING ====================

  private calculateETA(distanceKm: number): string {
    const minutes = Math.ceil(
      distanceKm * DISTANCE_TIME_MULTIPLIER + BASE_PREP_TIME,
    );
    return `${minutes}-${minutes + 15} mins`;
  }

  private calculateOrderETA(order: any): string {
    if (order.delivery?.distanceKm) {
      return this.calculateETA(order.delivery.distanceKm);
    }
    return DEFAULT_ETA;
  }

  private formatRiderInfo(rider: any) {
    if (!rider) return null;
    return {
      name: rider.name,
      phone: rider.phone,
      vehicle: rider.vehicle
        ? `${rider.vehicle.color} ${rider.vehicle.model} (${rider.vehicle.plateNumber})`
        : 'Motorcycle',
    };
  }

  private buildOrderTimeline(order: any) {
    const timeline: Array<{
      status: string;
      label: string;
      description: string;
      time: string | null;
      icon: string;
    }> = [];

    timeline.push({
      status: 'PLACED',
      label: 'Order Placed',
      description: 'Your order has been received',
      time: order.createdAt.toISOString(),
      icon: 'default',
    });

    if (
      ['CONFIRMED', 'PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'].includes(
        order.status,
      )
    ) {
      timeline.push({
        status: 'CONFIRMED',
        label: 'Order Confirmed',
        description: 'The restaurant has accepted your order',
        time: null,
        icon: 'kitchen',
      });
    }

    if (
      ['PREPARING', 'READY', 'DISPATCHED', 'DELIVERED'].includes(order.status)
    ) {
      timeline.push({
        status: 'PREPARING',
        label: 'Preparing',
        description: 'Your order is being processed',
        time: null,
        icon: 'kitchen',
      });
    }

    if (['READY', 'DISPATCHED', 'DELIVERED'].includes(order.status)) {
      timeline.push({
        status: 'READY',
        label: 'Order Ready',
        description: 'Order is ready for pickup',
        time: null,
        icon: 'package',
      });
    }

    const isDispatch =
      order.status === 'DISPATCHED' || order.status === 'DELIVERED';
    const isDeliveryActive =
      order.delivery &&
      ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(order.delivery.status);

    if (isDispatch || isDeliveryActive) {
      timeline.push({
        status: 'ON_THE_WAY',
        label: 'Rider on the way',
        description: `${order.delivery?.rider?.name || 'Rider'} is heading to you`,
        time: order.delivery?.pickedUpAt?.toISOString() || null,
        icon: 'rider',
      });
    }

    if (order.status === 'DELIVERED') {
      timeline.push({
        status: 'DELIVERED',
        label: 'Delivered',
        description: 'Order delivered successfully',
        time:
          order.deliveredAt?.toISOString() ||
          order.delivery?.deliveredAt?.toISOString() ||
          null,
        icon: 'delivered',
      });
    }

    if (order.status === 'CANCELLED' || order.status === 'REJECTED') {
      timeline.push({
        status: 'CANCELLED',
        label: 'Order Cancelled',
        description:
          order.status === 'REJECTED'
            ? 'Store rejected the order'
            : 'This order was cancelled',
        time: order.cancelledAt?.toISOString() || null,
        icon: 'default',
      });
    }

    return timeline;
  }
}
