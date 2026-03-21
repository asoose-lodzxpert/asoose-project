import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { DisputesModule } from '../dispute/dispute.module';
import { VendorModule } from '../vendors/vendor.module';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300000,
      max: 100,
    }),
    DisputesModule,
    VendorModule,
  ],
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
})
export class DashboardModule {}
