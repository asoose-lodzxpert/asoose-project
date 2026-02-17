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
    ),
  ],
})
export class QueueModule {}
