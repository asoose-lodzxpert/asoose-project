import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

@Module({
  imports: [
    // BullModule.forRootAsync is already registered globally in AppModule.
    // Only register the individual queues here.
    BullModule.registerQueue(
      { name: QUEUE_NAMES.RIDE_MATCHING },
      { name: QUEUE_NAMES.DELIVERY_MATCHING },
      { name: QUEUE_NAMES.DRIVER_INACTIVITY },
      { name: QUEUE_NAMES.RIDER_INACTIVITY },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.ASSIGNMENT_TIMEOUT },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
