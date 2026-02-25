import { Module } from '@nestjs/common';

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
import { RiderInactivityProcessor } from './workers/rider-inactivity.processor';
import { AssignmentTimeoutProcessor } from './workers/assignment-timeout.processor';

// Startup
import { StartupReconciliationService } from './startup-reconciliation.service';

// Prisma
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Matching System Module
 */
@Module({
  imports: [
    // EventEmitterModule is not imported here — the global instance configured in
    // AppModule (wildcard: true) is sufficient and must be the single source of truth.
    // A second forRoot() here would create a separate EventEmitter2 instance that
    // EventBusService would receive instead of the global one, silently breaking all
    // @OnEvent() listeners in other modules.
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
    RiderInactivityProcessor,
    AssignmentTimeoutProcessor,

    // Startup
    StartupReconciliationService,
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
