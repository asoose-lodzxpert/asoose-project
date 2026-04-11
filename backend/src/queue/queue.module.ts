import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.registerQueue(
      { name: 'ride-matching' },
      { name: 'delivery-matching' },
      { name: 'driver-inactivity' },
      { name: 'notification' },
      { name: 'assignment-timeout' },
      { name: 'email' },
      { name: 'scheduled-ride-assignment' },
      { name: 'scheduled-ride-reminder' },
      { name: 'scheduled-ride-health' },
    ),
  ],
})
export class QueueModule {}
