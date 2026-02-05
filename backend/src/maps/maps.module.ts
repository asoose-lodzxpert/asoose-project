import { Module } from '@nestjs/common';
import { LoggerModule } from '../libs/logger/logger.module';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

@Module({
  imports: [LoggerModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
