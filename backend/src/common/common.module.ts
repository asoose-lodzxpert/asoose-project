import { Module } from '@nestjs/common';
import { NotificationPreferenceService } from './services/notification-preference.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  providers: [NotificationPreferenceService],
  exports: [NotificationPreferenceService],
})
export class CommonModule {}
