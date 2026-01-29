import { Module } from '@nestjs/common';
import { RiderStateService } from './rider-state.service';
import { GeoModule } from '../geo/geo.module';
import { MatchingRedisModule } from '../redis/redis.module';
import { EventBusModule } from '../events/event-bus.module';

@Module({
  imports: [GeoModule, EventBusModule, MatchingRedisModule],
  providers: [RiderStateService],
  exports: [RiderStateService],
})
export class RiderStateModule {}
