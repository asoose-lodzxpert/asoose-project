import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Prisma, Product } from '@prisma/client';
import { CreateOrderDto, OrderItemDto } from './dto/users.dto';
import { Throttle } from '@nestjs/throttler';
import * as crypto from 'crypto';
import { PricingService } from './pricing.service';
import { AddressesService } from './addresses.service';
import { NotificationFacade } from './notification.facade';
import type { RedisClientType } from 'redis';
import { InventoryService } from './inventory.service';
import { VendorOrdersStreamService } from '../vendor/orders/vendor-orders-stream.service';

const ORDER_STATUS = { PENDING: 'PENDING' } as const;
const DELIVERY_STATUS = { REQUESTED: 'REQUESTED' } as const;

// Redis Config
const IDEMPOTENCY_PREFIX = 'idemp:order:';
const LOCK_TTL_MS = 20000; // 20s lock for processing
const COMPLETED_TTL_MS = 5 * 60 * 1000; // 5 mins cache for completed orders

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
    // CHANGED: Inject REDIS_CLIENT with correct type
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  // ==================================================================
  // 1. QUOTE CALCULATION
  // ==================================================================

  async calculateQuote(userId: string, data: CreateOrderDto) {
    const { addressId, restaurantId, items } = data;

    // A. Fetch Store & Address
    const store = await this.prisma.store.findUnique({
      where: { id: restaurantId },
      select: { lat: true, lng: true, name: true },
    });
    if (!store) throw new NotFoundException('Store not found');

    const address = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!address || address.userId !== userId) {
      throw new BadRequestException('Invalid delivery address');
    }

    // B. Calculate Subtotal
    const productIds = items.map((i) => i.id);
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    let subtotal = 0;
    items.forEach((item) => {
      const product = products.find((p) => p.id === item.id);
      if (product) {
        subtotal += product.price * item.quantity;
      }
    });

    // C. Calculate Fees
    const storeLat = store.lat || 0;
    const storeLng = store.lng || 0;

    const distance = this.pricingService.calculateDistance(
      storeLat,
      storeLng,
      address.lat,
      address.lng,
    );

    const deliveryFee = this.pricingService.calculateDeliveryFee(distance);
    // Assumes PricingService has calculateServiceFee(amount)
    const serviceFee = this.pricingService.calculateServiceFee(subtotal);
    const total = subtotal + deliveryFee + serviceFee;

    return {
      subtotal,
      deliveryFee,
      serviceFee,
      total,
      distanceKm: parseFloat(distance.toFixed(2)),
      estimatedTime: '30-45 mins',
    };
  }

  // ==================================================================
  // 2. ORDER CREATION LOGIC
  // ==================================================================

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createOrder(
    userId: string,
    data: CreateOrderDto,
    idempotencyHeader?: string,
  ) {
    // 1. Generate Key
    const rawKey = this.generateIdempotencyKey(userId, data, idempotencyHeader);
    const redisKey = `${IDEMPOTENCY_PREFIX}${rawKey}`;

    // 2. Acquire Lock (Redis Atomic Operation)
    const existingOrderId = await this.acquireIdempotencyLock(redisKey);

    if (existingOrderId) {
      this.logger.log(
        `Idempotency hit: Returning existing order ${existingOrderId}`,
      );
      return this.prisma.order.findUnique({
        where: { id: existingOrderId },
        include: { user: { select: { email: true, name: true } } },
      });
    }

    // Context for notifications
    const emailItems: string[] = [];
    let notificationContext: any = {};

    try {
      const { addressId, restaurantId, items } = data;
      this.validateOrderItems(items);

      const order = await this.prisma.$transaction(
        async (tx) => {
          // A. Fetch Entities
          const user = await tx.user.findUnique({
            where: { id: userId },
            select: { email: true, name: true, phone: true },
          });
          if (!user) throw new NotFoundException('User not found');

          const store = await tx.store.findUnique({
            where: { id: restaurantId },
            include: { vendor: { select: { email: true, id: true } } },
          });
          if (!store) throw new NotFoundException('Store not found');

          // B. Validate Products
          const productMap = await this.validateAndFetchProducts(tx, items);

          // C. Validate Inventory
          this.inventoryService.validateStock(items, productMap);

          // D. Handle Addresses
          const pickupAddress =
            await this.addressesService.getOrCreateStoreAddress(
              store.vendorId,
              store.address || 'Unknown Store Address',
              store.lat || 0.0,
              store.lng || 0.0,
              tx,
            );

          const dropoffAddress = await tx.address.findUnique({
            where: { id: addressId },
          });
          if (!dropoffAddress || dropoffAddress.userId !== userId) {
            throw new BadRequestException('Invalid delivery address');
          }

          // E. Pricing (Delivery)
          const distance = this.pricingService.calculateDistance(
            pickupAddress.lat,
            pickupAddress.lng,
            dropoffAddress.lat,
            dropoffAddress.lng,
          );
          const deliveryFee =
            this.pricingService.calculateDeliveryFee(distance);

          // F. Prepare Items Data & Calculate Subtotal
          let itemsTotal = 0;
          const orderItemsData: {
            productId: string;
            nameSnap: string;
            price: number;
            quantity: number;
          }[] = [];

          for (const item of items) {
            const product = productMap.get(item.id)!;
            const lineTotal = product.price * item.quantity;
            itemsTotal += lineTotal;

            orderItemsData.push({
              productId: product.id,
              nameSnap: this.addressesService.sanitizeString(product.name),
              price: product.price,
              quantity: item.quantity,
            });
            emailItems.push(`${item.quantity}x ${product.name}`);
          }

          // Calculate Service Fee and Final Total
          const serviceFee =
            this.pricingService.calculateServiceFee(itemsTotal);
          const finalTotal = itemsTotal + deliveryFee + serviceFee;

          // Set context for notifications
          notificationContext = {
            storeOwnerId: store.vendorId,
            storeName: store.name,
            storeOwnerEmail: store.vendor?.email, // Fixed: Added optional chaining
            customerEmail: user.email,
          };

          // G. Create Order
          const newOrder = await tx.order.create({
            data: {
              userId,
              storeId: restaurantId,
              total: finalTotal,
              status: ORDER_STATUS.PENDING,
              items: { create: orderItemsData },
              delivery: {
                create: {
                  customerId: userId,
                  pickupAddressId: pickupAddress.id,
                  dropoffAddressId: addressId,
                  status: DELIVERY_STATUS.REQUESTED,
                  deliveryFee: deliveryFee,
                  distanceKm: parseFloat(distance.toFixed(2)),
                  recipientName: user.name,
                  recipientPhone: user.phone || 'N/A',
                },
              },
            },
            include: {
              user: { select: { email: true, name: true } },
              store: { select: { name: true } },
            },
          });

          // H. Decrement Stock
          await this.inventoryService.decrementStock(tx, items);

          this.logger.log(
            `Order ${newOrder.id} created. Total: ₦${finalTotal} (Items: ${itemsTotal}, Del: ${deliveryFee}, Svc: ${serviceFee})`,
          );

          return newOrder;
        },
        { maxWait: 10000, timeout: 30000 },
      );

      // 3. Mark Idempotency as COMPLETED
      await this.completeIdempotency(redisKey, order.id);

      // 4. Emit SSE event for real-time vendor notification
      this.vendorOrdersStreamService.emitNewOrder(order.storeId, order.id, {
        id: order.id,
        status: order.status,
        total: order.total,
        customerName: order.user?.name || 'Unknown',
        customerEmail: order.user?.email || 'Unknown',
        storeName: order.store?.name || 'Unknown',
        itemCount: items.length,
        createdAt: order.createdAt,
      });

      // 5. Notifications
      this.notificationFacade.sendOrderNotifications(
        userId,
        notificationContext.storeOwnerId,
        order.id,
        notificationContext.storeName,
        order.total,
        notificationContext.customerEmail,
        notificationContext.storeOwnerEmail,
        emailItems,
      );

      return order;
    } catch (error) {
      // 6. Release Lock on Failure
      await this.releaseIdempotencyLock(redisKey);
      this.handleOrderError(userId, error);
    }
  }

  // ==================================================================
  // 3. READ OPERATIONS
  // ==================================================================

  async getUserOrders(userId: string) {
    try {
      const orders = await this.prisma.order.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        include: {
          items: { select: { quantity: true, nameSnap: true } },
          store: { select: { name: true, logo: true } }, // Fixed: logo not image
        },
        take: 50,
      });

      return orders.map((order) => ({
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        storeName: order.store?.name,
        storeLogo: order.store?.logo,
        items: order.items?.map((i) => ({
          name: i.nameSnap,
          quantity: i.quantity,
        })),
      }));
    } catch (error: any) {
      this.logger.error(
        `Failed to fetch orders for user ${userId}`,
        error.stack,
      );
      throw new BadRequestException('Failed to retrieve orders');
    }
  }

  async getOrderDetails(userId: string, orderId: string) {
    try {
      const order = await this.prisma.order.findFirst({
        where: { id: orderId, userId: userId },
        include: {
          items: true,
          delivery: { include: { dropoffAddress: true } },
          store: {
            select: {
              name: true,
              vendor: { select: { phone: true } },
            },
          },
          disputes: { select: { id: true, status: true } },
        },
      });

      if (!order) throw new NotFoundException('Order not found');

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
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
        },
      };
    } catch (error) {
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to retrieve order details');
    }
  }

  // ==================================================================
  // 4. HELPER METHODS
  // ==================================================================

  private async validateAndFetchProducts(
    tx: Prisma.TransactionClient,
    items: OrderItemDto[],
  ): Promise<Map<string, Product>> {
    const productIds = items.map((item) => item.id);
    const products = await tx.product.findMany({
      where: { id: { in: productIds } },
    });

    if (products.length !== items.length) {
      const foundIds = new Set(products.map((p) => p.id));
      const missingIds = productIds.filter((id) => !foundIds.has(id));
      throw new BadRequestException(
        `Products not found: ${missingIds.join(', ')}`,
      );
    }
    return new Map(products.map((p) => [p.id, p]));
  }

  private validateOrderItems(items: OrderItemDto[]): void {
    if (!items || items.length === 0) {
      throw new BadRequestException('Order must contain at least one item');
    }
    items.forEach((item) => {
      if (!item.id || !item.quantity || item.quantity <= 0) {
        throw new BadRequestException('Invalid item in order');
      }
    });
  }

  private handleOrderError(userId: string, error: any) {
    this.logger.error(
      `Order creation failed for ${userId}: ${error.message}`,
      error.stack,
    );
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
    throw new BadRequestException('Failed to create order');
  }

  // ==================================================================
  // 5. REDIS IDEMPOTENCY UTILS (UPDATED SYNTAX)
  // ==================================================================

  private async acquireIdempotencyLock(key: string): Promise<string | null> {
    // CHANGED: Use object syntax for options (Node-Redis v4+)
    const result = await this.redis.set(key, 'PROCESSING', {
      PX: LOCK_TTL_MS,
      NX: true,
    });

    if (result === 'OK') {
      return null;
    }

    const value = await this.redis.get(key);

    if (value === 'PROCESSING') {
      throw new ConflictException(
        'This order is currently being processed. Please wait.',
      );
    }

    return value;
  }

  private async completeIdempotency(
    key: string,
    orderId: string,
  ): Promise<void> {
    // CHANGED: Use object syntax for options
    await this.redis.set(key, orderId, { PX: COMPLETED_TTL_MS });
  }

  private async releaseIdempotencyLock(key: string): Promise<void> {
    await this.redis.del(key);
  }

  private generateIdempotencyKey(
    userId: string,
    data: CreateOrderDto,
    clientKey?: string,
  ): string {
    if (clientKey) {
      return `header:${userId}:${clientKey}`;
    }
    const { addressId, restaurantId, items } = data;
    const itemsString = items
      .map((i) => `${i.id}:${i.quantity}`)
      .sort()
      .join('|');
    const rawData = `${userId}:${addressId}:${restaurantId}:${itemsString}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }
}
