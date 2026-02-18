import { Module } from '@nestjs/common';
import { RidersModule as CoreRidersModule } from '../../riders/riders.module';
import { RidersService } from './riders.service';
import { RidersController } from './rider.controller';
import { PrismaModule } from 'src/prisma/prisma.module';
import { MailModule } from 'src/mail/mail.module';
import { ActivityLogService } from 'src/common/services/activity-log.services';

@Module({
  imports: [PrismaModule, MailModule, CoreRidersModule],
  controllers: [RidersController],
  providers: [RidersService, ActivityLogService],
})
export class RidersModule {}
