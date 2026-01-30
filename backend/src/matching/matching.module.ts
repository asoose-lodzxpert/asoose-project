import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';

// Redis
import { MatchingRedisModule } from './redis/redis.module';
import { RedisService } from './redis/redis.service';

// Geo
import { GeoService } from './geo/geo.service';

// Events
import { EventBusService } from './events/event-bus.service';

// Queue
import { QueueModule } from './queue/queue.module';
import { QueueService } from './queue/queue.service';

// Driver State
import { DriverStateService } from './driver-state/driver-state.service';
// Rider State
import { RiderStateService } from './rider-state/rider-state.service'; // <--- ADD IMPORT

// Workers
import { RideMatchingProcessor } from './workers/ride-matching.processor';
import { DeliveryMatchingProcessor } from './workers/delivery-matching.processor';
import { DriverInactivityProcessor } from './workers/driver-inactivity.processor';
import { AssignmentTimeoutProcessor } from './workers/assignment-timeout.processor';

// Prisma
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Matching System Module
 */
@Module({
  imports: [
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    MatchingRedisModule,
    QueueModule,
    PrismaModule,
  ],
  providers: [
    // Core Services
    GeoService,
    EventBusService,
    DriverStateService,
    RiderStateService, // <--- ADD PROVIDER

    // Workers (automatically registered by @Processor decorator)
    RideMatchingProcessor,
    DeliveryMatchingProcessor,
    DriverInactivityProcessor,
    AssignmentTimeoutProcessor,
  ],
  exports: [
    // RedisService,
    GeoService,
    EventBusService,
    QueueModule,
    // Re-export modules to make their services available
    MatchingRedisModule,
    QueueModule,
    // Export module-specific services
    GeoService,
    EventBusService,
    DriverStateService,
    RiderStateService, // <--- ADD EXPORT
  ],
})
export class MatchingModule {}
