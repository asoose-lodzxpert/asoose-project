import { Module } from '@nestjs/common';
import { EventBusService } from './event-bus.service';
import { EventEmitter2, EventEmitterModule } from '@nestjs/event-emitter';

@Module({
  imports: [EventEmitterModule.forRoot()],
  providers: [EventBusService],
  exports: [EventBusService],
})
export class EventBusModule {}
