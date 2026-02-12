import { Module } from '@nestjs/common';
import { ZonesService } from './zones.service';
import { ZonesController } from './zones.controller';
import { PrismaService } from 'src/prisma/prisma.service';
import { ActivityLogService } from 'src/common/services/activity-log.services';

@Module({
  controllers: [ZonesController],
  providers: [ZonesService, PrismaService, ActivityLogService],
})
export class ZonesModule {}
