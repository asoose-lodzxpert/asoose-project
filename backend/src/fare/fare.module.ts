import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { FareConntroller } from './fare.controller';
import { GeoService } from 'src/matching/geo/geo.service';
import { GeoModule } from '../matching/geo/geo.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [GeoModule, AuthModule],
  controllers: [FareConntroller],
  providers: [FareService, GeoService],
  exports: [FareService],
})
export class FareModule {}
