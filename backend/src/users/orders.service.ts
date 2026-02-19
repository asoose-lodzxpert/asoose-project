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
import { FareService } from '../fare/fare.service';
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
    private fareService: FareService,
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

      // ── Compute subtotals per store ───────────────────────────────
      type StoreEntry = {
        storeId: string;
        storeName: string;
        lat: number;
        lng: number;
        subtotal: number;
        enrichedItems: any[];
      };

      const storeEntries: StoreEntry[] = [];
      for (const [storeId, groupItems] of storeGroups) {
        const firstProduct = productMap.get(groupItems[0].id)!;
        const store = firstProduct.store;
        let subtotal = 0;
        const enrichedItems = groupItems.map((item) => {
          const p = productMap.get(item.id)!;
          subtotal += p.price * item.quantity;
          return { ...item, name: p.name, price: p.price };
        });
        storeEntries.push({
          storeId,
          storeName: store.name,
          lat: store.lat ?? 0,
          lng: store.lng ?? 0,
          subtotal,
          enrichedItems,
        });
      }

      // ── Route-optimized total delivery fee (FareService formula) ──
      const storeCoords = storeEntries.map((s) => ({
        storeId: s.storeId,
        lat: s.lat,
        lng: s.lng,
      }));

      const { sortedStoreIds, totalRouteKm } = this.optimizeRoute(
        dropoffAddress.lat,
        dropoffAddress.lng,
        storeCoords,
      );

      const totalDeliveryFee = Math.round(
        this.fareService.BaseDeliveryFare +
          totalRouteKm * this.fareService.DeliveryPerKm,
      );

      const grandSubtotal = storeEntries.reduce(
        (sum, s) => sum + s.subtotal,
        0,
      );

      // ── Build breakdown in route order ────────────────────────────
      const storeMap = new Map(storeEntries.map((s) => [s.storeId, s]));

      const breakdown = sortedStoreIds.map((storeId) => {
        const s = storeMap.get(storeId)!;

        const deliveryFee =
          grandSubtotal > 0
            ? Math.round(totalDeliveryFee * (s.subtotal / grandSubtotal))
            : Math.round(totalDeliveryFee / storeEntries.length);

        const serviceFee = this.pricingService.calculateServiceFee(s.subtotal);
        const total = s.subtotal + deliveryFee + serviceFee;

        return {
          storeName: s.storeName,
          storeId: s.storeId,
          items: s.enrichedItems,
          subtotal: s.subtotal,
          deliveryFee,
          serviceFee,
          total,
        };
      });

      const grandTotal = breakdown.reduce((sum, b) => sum + b.total, 0);

      return {
        groups: breakdown,
        totalDeliveryFee,
        grandTotal,
        totalRouteKm: parseFloat(totalRouteKm.toFixed(2)),
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

  // ==================== HELPER: ROUTE OPTIMIZER ====================

  /**
   * Greedy nearest-neighbor route optimizer.
   * Orders stores along a single path from the customer's location,
   * minimising total rider travel distance.
   *
   * Route: customer → storeA → storeB → … → customer
   * Returns stores sorted in visit order + total route distance in km.
   */
  private optimizeRoute(
    customerLat: number,
    customerLng: number,
    stores: Array<{ storeId: string; lat: number; lng: number }>,
  ): { sortedStoreIds: string[]; totalRouteKm: number } {
    if (stores.length === 1) {
      const d = this.pricingService.calculateDistance(
        customerLat,
        customerLng,
        stores[0].lat,
        stores[0].lng,
      );
      // single store: customer → store → customer
      return { sortedStoreIds: [stores[0].storeId], totalRouteKm: d * 2 };
    }

    const unvisited = [...stores];
    const visited: string[] = [];
    let curLat = customerLat;
    let curLng = customerLng;
    let totalRouteKm = 0;

    while (unvisited.length > 0) {
      // Find nearest unvisited store from current position
      let nearestIdx = 0;
      let nearestDist = Infinity;
      for (let i = 0; i < unvisited.length; i++) {
        const d = this.pricingService.calculateDistance(
          curLat,
          curLng,
          unvisited[i].lat,
          unvisited[i].lng,
        );
        if (d < nearestDist) {
          nearestDist = d;
          nearestIdx = i;
        }
      }

      const chosen = unvisited.splice(nearestIdx, 1)[0];
      visited.push(chosen.storeId);
      totalRouteKm += nearestDist;
      curLat = chosen.lat;
      curLng = chosen.lng;
    }

    // Final leg: last store → customer
    totalRouteKm += this.pricingService.calculateDistance(
      curLat,
      curLng,
      customerLat,
      customerLng,
    );

    return { sortedStoreIds: visited, totalRouteKm };
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

    // ── Phase 1: Resolve pickup addresses & compute item totals in parallel ──
    const storeEntries = Array.from(storeGroups.entries());
    const resolvedStores = await Promise.all(
      storeEntries.map(async ([storeId, groupItems]) => {
        const firstProduct = productMap.get(groupItems[0].id)!;
        const store = firstProduct.store;

        const pickupAddress =
          await this.addressesService.getOrCreateStoreAddress(
            store.vendorId,
            store.address || 'Unknown',
            store.lat || 0,
            store.lng || 0,
            this.prisma,
          );

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

        return {
          storeId,
          store,
          pickupAddress,
          itemsTotal,
          orderItemsData,
          groupItems,
          emailItems: groupItems.map(
            (i) => `${i.quantity}x ${productMap.get(i.id)?.name}`,
          ),
        };
      }),
    );

    // ── Phase 2: Route-optimized delivery fee (FareService formula) ──
    //
    // Single store  → straight line: store → customer, fee = 700 + km × 400
    // Multi-store   → one rider travels: customer → store_A → store_B → customer
    //                 Total route km computed by greedy nearest-neighbor.
    //                 Single fee on total route, split proportionally by subtotal.
    const isSingleStore = resolvedStores.length === 1;
    const storeCoords = resolvedStores.map((s) => ({
      storeId: s.storeId,
      lat: s.pickupAddress.lat,
      lng: s.pickupAddress.lng,
    }));

    let totalRouteKm: number;
    let sortedStoreIds: string[];

    if (isSingleStore) {
      const s = resolvedStores[0];
      totalRouteKm = this.pricingService.calculateDistance(
        s.pickupAddress.lat,
        s.pickupAddress.lng,
        dropoffAddress.lat,
        dropoffAddress.lng,
      );
      sortedStoreIds = [s.storeId];
    } else {
      const route = this.optimizeRoute(
        dropoffAddress.lat,
        dropoffAddress.lng,
        storeCoords,
      );
      totalRouteKm = route.totalRouteKm;
      sortedStoreIds = route.sortedStoreIds;
    }

    // FareService delivery formula — matches the /fare/delivery endpoint exactly
    const totalDeliveryFee = Math.round(
      this.fareService.BaseDeliveryFare +
        totalRouteKm * this.fareService.DeliveryPerKm,
    );

    // Sum of all item subtotals (used for proportional split)
    const grandSubtotal = resolvedStores.reduce(
      (sum, s) => sum + s.itemsTotal,
      0,
    );

    // ── Phase 3: Build PreparedStoreContext in optimized route order ──
    let calculatedGrandTotal = 0;

    const storeMap = new Map(resolvedStores.map((s) => [s.storeId, s]));

    const preparedStores: PreparedStoreContext[] = sortedStoreIds.map(
      (storeId) => {
        const s = storeMap.get(storeId)!;

        // Proportional fee share: store's share of total delivery fee
        const deliveryFee =
          grandSubtotal > 0
            ? Math.round(totalDeliveryFee * (s.itemsTotal / grandSubtotal))
            : Math.round(totalDeliveryFee / resolvedStores.length);

        // Point-to-point distance stored on Delivery record
        const distance = this.pricingService.calculateDistance(
          s.pickupAddress.lat,
          s.pickupAddress.lng,
          dropoffAddress.lat,
          dropoffAddress.lng,
        );

        const serviceFee = this.pricingService.calculateServiceFee(
          s.itemsTotal,
        );
        const finalTotal = s.itemsTotal + deliveryFee + serviceFee;
        calculatedGrandTotal += finalTotal;

        return {
          storeId,
          store: s.store,
          pickupAddressId: s.pickupAddress.id,
          distance,
          deliveryFee,
          serviceFee,
          finalTotal,
          orderItemsData: s.orderItemsData,
          groupItems: s.groupItems,
          emailItems: s.emailItems,
        };
      },
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
