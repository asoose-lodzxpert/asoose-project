import { Module } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { DashboardController } from './dashboard.controller';
import { DashboardService } from './dashboard.service';
import { PrismaService } from 'src/prisma/prisma.service';

@Module({
  imports: [
    CacheModule.register({
      ttl: 300000, // Default 5 minutes (in milliseconds)
      max: 100, // Max number of items in cache
    }),
  ],
  controllers: [DashboardController],
  providers: [DashboardService, PrismaService],
})
export class DashboardModule {}