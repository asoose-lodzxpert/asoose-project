import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { QUEUE_NAMES } from './queue.constants';
import { QueueService } from './queue.service';

@Module({
  imports: [
    ConfigModule,
    BullModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        connection: {
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('REDIS_QUEUE_DB', 1), // Use different DB for queues
        },
        defaultJobOptions: {
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
          removeOnComplete: {
            age: 24 * 3600, // 24 hours
            count: 1000,
          },
          removeOnFail: {
            age: 7 * 24 * 3600, // 7 days
          },
        },
      }),
      inject: [ConfigService],
    }),

    // Register all queues
    BullModule.registerQueue(
      { name: QUEUE_NAMES.RIDE_MATCHING },
      { name: QUEUE_NAMES.DELIVERY_MATCHING },
      { name: QUEUE_NAMES.DRIVER_INACTIVITY },
      { name: QUEUE_NAMES.NOTIFICATION },
      { name: QUEUE_NAMES.ASSIGNMENT_TIMEOUT },
    ),
  ],
  providers: [QueueService],
  exports: [BullModule, QueueService],
})
export class QueueModule {}
