import { Module } from '@nestjs/common';
import { AnalyticsController } from './reports.controller';
import { AnalyticsService } from './reports.service';
import { PrismaModule } from 'src/prisma/prisma.module';
@Module({
  imports: [PrismaModule],
  controllers: [AnalyticsController],
  providers: [AnalyticsService],
  exports: [AnalyticsService],
})
export class AnalyticsModule {}
