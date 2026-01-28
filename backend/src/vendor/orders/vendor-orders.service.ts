import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { OrderStatus } from '@prisma/client';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { NotificationsGateway } from 'src/notifications/notifications.gateway';

@Injectable()
export class VendorOrdersService {
  private readonly logger = new Logger(VendorOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
    private readonly notificationsGateway: NotificationsGateway,
  ) {}

  private async validateOrderAccess(userId: string, orderId: string) {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        store: { select: { vendorId: true, name: true } },
      },
    });

    if (!order) {
      this.logger.warn(`Order not found: ${orderId}`);
      throw new NotFoundException('Order not found');
    }

    if (order.store?.vendorId !== userId) {
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  async findAll(vendorId: string, status?: string, page = 1, limit = 20) {
    const store = await this.prisma.store.findFirst({
      where: { vendorId },
    });

    if (!store) {
      this.logger.warn(`No store found for vendor ${vendorId}`);
      return {
        data: [],
        meta: { total: 0, page, limit, pages: 0 },
      };
    }

    const skip = (page - 1) * limit;

    const whereClause: any = { storeId: store.id };

    whereClause.paymentStatus = 'PAID';

    if (status) {
      const statuses = status.split(',').map((s) => s.trim());
      if (statuses.length === 1) {
        whereClause.status = statuses[0];
      } else {
        whereClause.status = { in: statuses };
      }
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          items: true,
          user: { select: { name: true, phone: true, image: true } },
          delivery: { select: { status: true, riderId: true } },
        },
      }),
      this.prisma.order.count({ where: whereClause }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  async acceptOrder(userId: string, orderId: string) {
    const order = await this.validateOrderAccess(userId, orderId);

    if (order.paymentStatus !== 'PAID') {
      throw new BadRequestException(`Order has not been paid yet!`);
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot accept order in ${order.status} status`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    // Real-time update
    this.notificationsGateway.sendOrderUpdate(updated.id, {
      status: 'CONFIRMED',
      timeline: [
        {
          status: 'PLACED',
          time: updated.createdAt.toISOString(),
          icon: 'default',
        },
        {
          status: 'CONFIRMED',
          label: 'Order Confirmed',
          time: new Date().toISOString(),
          icon: 'store',
        },
        {
          status: 'PREPARING',
          label: 'Store is packaging your order',
          time: new Date().toISOString(),
        },
      ],
    });

    return updated;
  }

  async declineOrder(userId: string, orderId: string, reason: string) {
    const order = await this.validateOrderAccess(userId, orderId);

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Can only decline PENDING orders');
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REJECTED,
          cancelledAt: new Date(),
        },
      });

      await tx.activityLog.create({
        data: {
          userId,
          action: 'ORDER_REJECTED',
          target: orderId,
          details: reason,
          metadata: { storeName: order.store?.name },
        },
      });

      // Real-time update
      this.notificationsGateway.sendOrderUpdate(updated.id, {
        status: 'REJECTED',
        timeline: [
          { status: 'PLACED', time: updated.createdAt.toISOString() },
          {
            status: 'CANCELLED',
            label: 'Order Declined',
            description: reason,
            time: new Date().toISOString(),
          },
        ],
      });

      return updated;
    });
  }

  async markReady(userId: string, orderId: string) {
    const order = await this.validateOrderAccess(userId, orderId);

    if (order.status !== 'PREPARING' && order.status !== 'CONFIRMED') {
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

    this.notificationsGateway.sendOrderUpdate(updated.id, {
      status: 'READY',
    });

    return updated;
  }

  async startPreparing(userId: string, orderId: string) {
    const order = await this.validateOrderAccess(userId, orderId);

    if (order.status !== 'CONFIRMED') {
      throw new BadRequestException('Order must be confirmed first');
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PREPARING },
    });

    this.notificationsGateway.sendOrderUpdate(updated.id, {
      status: 'PREPARING',
    });

    return updated;
  }
}
