/**
 * Matching System - Public API
 *
 * This is the main entry point for the matching system.
 * Import this module in your AppModule to enable ride/delivery matching.
 */

export { MatchingModule } from './matching.module';

// Services
export { RedisService } from './redis/redis.service';
export { GeoService } from './geo/geo.service';
export { EventBusService } from './events/event-bus.service';
export { QueueService } from './queue/queue.service';
export { DriverStateService } from './driver-state/driver-state.service';

// Event Types
export * from './events/event-types';

// DTOs
export * from './dto/matching.dto';

// Constants
export {
  REDIS_KEYS,
  REDIS_TTL,
  DriverStatus,
} from './redis/redis-keys.constants';

export {
  QUEUE_NAMES,
  JOB_TYPES,
  WORKER_CONCURRENCY,
} from './queue/queue.constants';
