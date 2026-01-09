import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { VendorOrdersService } from './vendor-orders.service';
import { PrismaService } from 'src/prisma/prisma.service';
@Injectable()
export class OrderCleanupService {
  private readonly logger = new Logger(OrderCleanupService.name);

  constructor(
    private prisma: PrismaService,
    private vendorOrdersService: VendorOrdersService
  ) {}

  // Runs every 5 minutes
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoDeclineStaleOrders() {
    this.logger.log('Running stale order cleanup...');
    
    const fifteenMinutesAgo = new Date(Date.now() - 15 * 60 * 1000);

    const staleOrders = await this.prisma.order.findMany({
      where: {
        status: 'PENDING',
        createdAt: { lt: fifteenMinutesAgo }
      },
      include: { store: true } // Need ownerId for the service call
    });

    for (const order of staleOrders) {
      try {
        await this.vendorOrdersService.declineOrder(
order.store.vendorId,
          order.id,
          'Auto-declined: Vendor did not respond in time.'
        );
        this.logger.log(`Auto-declined order ${order.id}`);
      } catch (e) {
        this.logger.error(`Failed to auto-decline order ${order.id}`, e);
      }
    }
  }
}