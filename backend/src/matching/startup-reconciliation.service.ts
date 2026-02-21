import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

/**
 * StartupReconciliationService
 *
 * Runs once on application bootstrap.
 * On every restart, ALL riders/drivers are marked offline in Prisma.
 * No Redis state is restored — users must tap "Go Online" themselves.
 * This prevents ghost-ONLINE entries and stale Redis state.
 */
@Injectable()
export class StartupReconciliationService implements OnApplicationBootstrap {
  private readonly logger = new Logger(StartupReconciliationService.name);

  constructor(private readonly prisma: PrismaService) {}

  async onApplicationBootstrap(): Promise<void> {
    this.logger.log('Startup reconciliation: clearing all online states…');

    try {
      const result = await this.prisma.rider.updateMany({
        where: { isOnline: true },
        data: { isOnline: false },
      });

      this.logger.log(
        `Reconciliation complete — marked ${result.count} rider(s)/driver(s) offline. They must go online again.`,
      );
    } catch (err) {
      this.logger.error('Reconciliation failed (non-fatal):', err?.message);
    }
  }
}
