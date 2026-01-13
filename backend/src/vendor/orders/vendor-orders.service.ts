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

@Injectable()
export class VendorOrdersService {
  private readonly logger = new Logger(VendorOrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  // HELPER: Security & Validation
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

    // Strict Ownership Check
    if (order.store?.vendorId !== userId) {
      this.logger.warn(
        `Security Alert: User ${userId} tried to access order ${orderId}`,
      );
      throw new ForbiddenException('You do not have access to this order');
    }

    return order;
  }

  // BUSINESS LOGIC

  // 1. LIST ORDERS
  async findAll(userId: string, storeId: string, page = 1, limit = 20) {
    const store = await this.prisma.store.findUnique({
      where: { id: storeId },
    });
    if (!store || store.vendorId !== userId) {
      throw new ForbiddenException('Invalid store access');
    }

    const skip = (page - 1) * limit;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where: { storeId },
        orderBy: { createdAt: 'desc' },
        take: limit,
        skip,
        include: {
          items: true,
          user: { select: { name: true, phone: true } },
          delivery: { select: { status: true, riderId: true } },
        },
      }),
      this.prisma.order.count({ where: { storeId } }),
    ]);

    return {
      data,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    };
  }

  // 2. ACCEPT ORDER
  async acceptOrder(userId: string, orderId: string) {
    const order = await this.validateOrderAccess(userId, orderId);

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Cannot accept order in ${order.status} status`,
      );
    }

    const updated = await this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.CONFIRMED },
    });

    this.logger.log(`Order ${orderId} ACCEPTED by vendor ${userId}`);
    return updated;
  }

  // 3. DECLINE ORDER
  async declineOrder(userId: string, orderId: string, reason: string) {
    const order = await this.validateOrderAccess(userId, orderId);

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Can only decline PENDING orders');
    }

    // Atomic Transaction: Cancel Order + Log Activity
    return this.prisma.$transaction(async (tx) => {
      // A. Update Status
      const updated = await tx.order.update({
        where: { id: orderId },
        data: {
          status: OrderStatus.REJECTED,
          cancelledAt: new Date(),
        },
      });

      // B. Log Activity
      await tx.activityLog.create({
        data: {
          userId,
          action: 'ORDER_REJECTED',
          target: orderId,
          details: reason,
          metadata: { storeName: order.store?.name },
        },
      });

      // =================================================================
      // [TODO] FINANCIAL RESPONSIBILITY HANDOFF
      // The actual refund logic (Payment update + Ledger transaction)
      // should be handled here by the Finance Module (TransactionService).
      // You should emit an event like 'order.cancelled' for them to listen to.
      // =================================================================

      return updated;
    });
  }

  // 4. MARK READY (Triggers Rider Dispatch)
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

    // Notify Rider Module (Operational, not Financial)
    this.eventEmitter.emit('order.ready', {
      orderId: updated.id,
      storeId: updated.storeId,
    });

    this.logger.log(`Order ${orderId} READY. Rider dispatch event emitted.`);
    return updated;
  }

  async startPreparing(userId: string, orderId: string) {
    const order = await this.validateOrderAccess(userId, orderId);

    if (order.status !== 'CONFIRMED') {
      throw new BadRequestException('Order must be confirmed first');
    }

    return this.prisma.order.update({
      where: { id: orderId },
      data: { status: OrderStatus.PREPARING },
    });
  }
}
