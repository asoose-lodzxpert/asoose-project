import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { FareConntroller } from './fare.controller';
import { GeoService } from 'src/matching/geo/geo.service';
import { GeoModule } from '../matching/geo/geo.module';

@Module({
  imports: [GeoModule],
  controllers: [FareConntroller],
  providers: [FareService, GeoService],
  exports: [FareService],
})
export class FareModule {}
