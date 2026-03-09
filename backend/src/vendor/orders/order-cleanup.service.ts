import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VendorOrdersService } from './vendor-orders.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Injectable()
export class OrderCleanupService {
  private readonly logger = new Logger(OrderCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private vendorOrdersService: VendorOrdersService,
  ) {}

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
