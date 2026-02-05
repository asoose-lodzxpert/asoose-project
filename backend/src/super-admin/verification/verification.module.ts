import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { VerificationService } from './verification.service';
import { VerificationController } from './verification.controller';
import { ActivityLogService } from 'src/common/services/activity-log.services';

@Module({
  controllers: [VerificationController],
  providers: [VerificationService, PrismaService, ActivityLogService],
})
export class VerificationModule {}