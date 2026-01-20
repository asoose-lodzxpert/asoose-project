import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ConfigModule } from '@nestjs/config';

// Redis
import { RedisModule } from './redis/redis.module';
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

// Workers
import { RideMatchingProcessor } from './workers/ride-matching.processor';
import { DeliveryMatchingProcessor } from './workers/delivery-matching.processor';
import { DriverInactivityProcessor } from './workers/driver-inactivity.processor';
import { AssignmentTimeoutProcessor } from './workers/assignment-timeout.processor';

// Prisma
import { PrismaModule } from '../prisma/prisma.module';

/**
 * Matching System Module
 *
 * This module encapsulates the entire ride-hailing and delivery matching system.
 *
 * Architecture:
 * - Redis: Real-time state store (driver location, status, assignments)
 * - H3: Hexagonal geospatial indexing for efficient proximity search
 * - BullMQ: Queue-based matching workers (horizontal scaling)
 * - Event-driven: All state changes emit events for decoupled services
 * - Atomic operations: Lua scripts prevent race conditions
 *
 * Key Design Decisions:
 * ✅ NO driver state in database - only Redis
 * ✅ All matching happens in queue workers - not in API handlers
 * ✅ Hex-based spatial indexing for O(1) proximity lookup
 * ✅ Atomic Lua scripts for thread-safe state transitions
 * ✅ Event-driven notifications and analytics
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    EventEmitterModule.forRoot({
      wildcard: true,
      delimiter: '.',
      maxListeners: 20,
    }),
    RedisModule,
    QueueModule,
    PrismaModule,
  ],
  providers: [
    // Core Services
    GeoService,
    EventBusService,
    DriverStateService,

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
    DriverStateService,
  ],
})
export class MatchingModule {}
