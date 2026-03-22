import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VendorOrdersService } from './vendor-orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';

@Injectable()
export class OrderCleanupService {
  private readonly logger = new Logger(OrderCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private vendorOrdersService: VendorOrdersService,
    private eventEmitter: EventEmitter2,
  ) { }

  /**
   * Auto-decline PAID orders that the vendor hasn't responded to within 15 minutes.
   * Only targets paid orders so unpaid orders get their own 1-hour window below.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoDeclineStaleOrders() {
    this.logger.log(
      'Running stale order cleanup (paid, vendor no-response)...',
    );

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const staleOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: 'PAID', // Only target paid orders here
        createdAt: { lt: fifteenMinutesAgo },
      },
      include: { store: true },
    });

    for (const order of staleOrders) {
      try {
        await this.vendorOrdersService.declineOrder(
          order.store.vendorId,
          order.id,
          'Auto-declined: Vendor did not respond in time.',
        );
        this.logger.log(`Auto-declined order ${order.id}`);
      } catch (e) {
        this.logger.error(`Failed to auto-decline order ${order.id}`, e);
      }
    }
  }

  /**
   * Alert admins if a PAID order is stuck at ANY stage for > 15 minutes.
   * Runs every 5 minutes. Uses a 5-minute time window to avoid duplicate alerts.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async alertAdminsOfStaleProcessing() {
    this.logger.log('Checking for orders stuck at processing stages...');

    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);
    const twentyMinutesAgo = new Date(Date.now() - 20 * 60 * 1000);

    const stalledOrders = await this.prisma.order.findMany({
      where: {
        status: { in: ['PENDING', 'CONFIRMED', 'PREPARING', 'READY'] },
        paymentStatus: { in: ['PAID', 'COMPLETED'] },
        updatedAt: {
          lte: fifteenMinutesAgo,
          gt: twentyMinutesAgo,
        },
      },
      include: { store: true },
    });

    for (const order of stalledOrders) {
      this.eventEmitter.emit('system.action', {
        action: 'STALE_ORDER_WARNING',
        severity: 'NORMAL',
        title: '⚠️ Stale Order Processing',
        message: `Order #${order.id.split('-')[0]} from ${order.store?.name || 'Store'} has been stuck in ${order.status} status for over 15 minutes.`,
        metadata: { orderId: order.id, status: order.status, storeId: order.storeId },
      });

      this.logger.log(`Issued Admin stale warning for order ${order.id}`);
    }
  }

  /**
   * Cancel orders where payment was not completed within 1 hour.
   * Runs every 5 minutes; targets PENDING orders with paymentStatus != PAID.
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoCancelUnpaidOrders() {
    this.logger.log('Running unpaid order cancellation check...');

    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

    const unpaidOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        paymentStatus: { not: 'PAID' },
        createdAt: { lt: oneHourAgo },
      },
      include: {
        delivery: { select: { id: true } },
      },
    });

    for (const order of unpaidOrders) {
      try {
        await this.prisma.$transaction(async (tx) => {
          await tx.order.update({
            where: { id: order.id },
            data: {
              status: 'CANCELLED',
              paymentStatus: 'FAILED',
              cancelledAt: new Date(),
            },
          });

          if (order.delivery) {
            await tx.delivery.update({
              where: { id: order.delivery.id },
              data: { status: 'CANCELLED' },
            });
          }

          await tx.activityLog.create({
            data: {
              userId: order.userId,
              action: 'ORDER_CANCELLED',
              target: order.id,
              details: 'Payment not made on time',
              status: 'AUTO',
            },
          });
        });

        this.logger.log(`Auto-cancelled unpaid order ${order.id}`);
      } catch (e) {
        this.logger.error(`Failed to auto-cancel unpaid order ${order.id}`, e);
      }
    }
  }
}
