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
import { NotificationsGateway } from '../notifications/notifications.gateway';

const ORDER_STATUS = { PENDING: 'PENDING' } as const;
const DELIVERY_STATUS = { REQUESTED: 'REQUESTED' } as const;

const IDEMPOTENCY_PREFIX = 'idemp:order:';
const LOCK_TTL_MS = 20000;
const COMPLETED_TTL_MS = 5 * 60 * 1000;

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
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  async calculateQuote(userId: string, data: CreateOrderDto) {
    const { addressId, restaurantId, items } = data;

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

    const storeLat = store.lat || 0;
    const storeLng = store.lng || 0;

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
      estimatedTime: '30-45 mins',
    };
  }

  @Throttle({ default: { limit: 5, ttl: 60000 } })
  async createOrder(
    userId: string,
    data: CreateOrderDto,
    idempotencyHeader?: string,
  ) {
    const rawKey = this.generateIdempotencyKey(userId, data, idempotencyHeader);
    const redisKey = `${IDEMPOTENCY_PREFIX}${rawKey}`;

    const existingOrderId = await this.acquireIdempotencyLock(redisKey);

    if (existingOrderId) {
      return this.prisma.order.findUnique({
        where: { id: existingOrderId },
        include: { user: { select: { email: true, name: true } } },
      });
    }

    const emailItems: string[] = [];
    let notificationContext: any = {};

    try {
      const { addressId, restaurantId, items } = data;
      this.validateOrderItems(items);

      const order = await this.prisma.$transaction(
        async (tx) => {
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

          const productMap = await this.validateAndFetchProducts(tx, items);
          this.inventoryService.validateStock(items, productMap);

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
            select: {
              id: true,
              userId: true,
              street: true,
              city: true,
              state: true,
              lat: true,
              lng: true,
              label: true,
              vendorId: true,
              isDefault: true,
            },
          });
          if (!dropoffAddress || dropoffAddress.userId !== userId) {
            throw new BadRequestException('Invalid delivery address');
          }

          const distance = this.pricingService.calculateDistance(
            pickupAddress.lat,
            pickupAddress.lng,
            dropoffAddress.lat,
            dropoffAddress.lng,
          );
          const deliveryFee =
            this.pricingService.calculateDeliveryFee(distance);

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

          const serviceFee =
            this.pricingService.calculateServiceFee(itemsTotal);
          const finalTotal = itemsTotal + deliveryFee + serviceFee;

          notificationContext = {
            storeOwnerId: store.vendorId,
            storeName: store.name,
            storeOwnerEmail: store.vendor?.email,
            customerEmail: user.email,
          };

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

          await this.inventoryService.decrementStock(tx, items);

          return newOrder;
        },
        { maxWait: 10000, timeout: 30000 },
      );

      await this.completeIdempotency(redisKey, order.id);

      try {
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
        });
      } catch (notifyError) {
        this.logger.error(
          `Post-order notification failed for order ${order.id}`,
          notifyError,
        );
      }

      return order;
    } catch (error) {
      await this.releaseIdempotencyLock(redisKey);
      this.handleOrderError(userId, error);
    }
  }

  async getUserOrders(
    userId: string,
    opts?: { page?: number; pageSize?: number; status?: string },
  ) {
    try {
      const page = opts?.page || 1;
      const pageSize = opts?.pageSize || 10;
      const status = opts?.status;
      const where: any = { userId };
      if (status) where.status = status;
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

      if (!order) throw new NotFoundException('Order not found');

      // FIX 2: Correct Timeline Status Checks based on Schema (DISPATCHED, IN_TRANSIT)
      const timeline: {
        status: string;
        label: string;
        description: string;
        time: string | null;
        icon: string;
      }[] = [];

      // 1. Placed
      timeline.push({
        status: 'PLACED',
        label: 'Order Placed',
        description: 'Your order has been received',
        time: order.createdAt.toISOString(),
        icon: 'default',
      });

      // 2. Confirmed (Includes DISPATCHED, which implies confirmation)
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

      // 3. Preparing
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

      // 4. Ready/Picked Up
      if (['READY', 'DISPATCHED', 'DELIVERED'].includes(order.status)) {
        timeline.push({
          status: 'READY',
          label: 'Order Ready',
          description: 'Order is ready for pickup',
          time: null,
          icon: 'package',
        });
      }

      // 5. On the Way (Uses DISPATCHED or Delivery status)
      // Checks for Order Status: DISPATCHED or Delivery Status: IN_TRANSIT / PICKED_UP
      const isDispatch =
        order.status === 'DISPATCHED' || order.status === 'DELIVERED';
      const isDeliveryActive =
        order.delivery &&
        ['PICKED_UP', 'IN_TRANSIT', 'DELIVERED'].includes(
          order.delivery.status,
        );

      if (isDispatch || isDeliveryActive) {
        timeline.push({
          status: 'ON_THE_WAY',
          label: 'Rider on the way',
          description: `${order.delivery?.rider?.name || 'Rider'} is heading to you`,
          time: order.delivery?.pickedUpAt?.toISOString() || null,
          icon: 'rider',
        });
      }

      // 6. Delivered
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

      return {
        id: order.id,
        status: order.status,
        total: order.total,
        createdAt: order.createdAt,
        deliveredAt: order.deliveredAt,
        eta: order.delivery?.distanceKm
          ? `${Math.ceil(order.delivery.distanceKm * 5 + 15)} mins`
          : '30-45 mins',
        distance: order.delivery?.distanceKm
          ? `${order.delivery.distanceKm} km`
          : null,
        timeline: timeline,
        rider: order.delivery?.rider
          ? {
              name: order.delivery.rider.name,
              phone: order.delivery.rider.phone,
              vehicle: order.delivery.rider.vehicle
                ? `${order.delivery.rider.vehicle.color} ${order.delivery.rider.vehicle.model} (${order.delivery.rider.vehicle.plateNumber})`
                : 'Motorcycle',
            }
          : null,
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
      if (error instanceof NotFoundException) throw error;
      throw new BadRequestException('Failed to retrieve order details');
    }
  }

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

  private async acquireIdempotencyLock(key: string): Promise<string | null> {
    const result = await this.redis.set(key, 'PROCESSING', {
      PX: LOCK_TTL_MS,
      NX: true,
    });
    if (result === 'OK') return null;
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
    if (clientKey) return `header:${userId}:${clientKey}`;
    const { addressId, restaurantId, items } = data;
    const itemsString = items
      .map((i) => `${i.id}:${i.quantity}`)
      .sort()
      .join('|');
    const rawData = `${userId}:${addressId}:${restaurantId}:${itemsString}`;
    return crypto.createHash('sha256').update(rawData).digest('hex');
  }
}
