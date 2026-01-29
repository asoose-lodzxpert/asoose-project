import { Module } from '@nestjs/common';
import { DriverStateService } from './driver-state.service';
import { GeoModule } from '../geo/geo.module';
import { EventBusModule } from '../events/event-bus.module';
// Import RedisModule if you have it

@Module({
  imports: [GeoModule, EventBusModule],
  providers: [DriverStateService],
  exports: [DriverStateService],
})
export class DriverStateModule {}
