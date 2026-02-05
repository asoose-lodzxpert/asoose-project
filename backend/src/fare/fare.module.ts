import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { FareConntroller } from './fare.controller';

@Module({
  controllers: [FareConntroller],
  providers: [FareService],
  exports: [FareService],
})
export class FareModule {}
