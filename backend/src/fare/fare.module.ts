import { Module } from '@nestjs/common';
import { FareService } from './fare.service';
import { FareConntroller } from './fare.controller';
import { GeoService } from 'src/matching/geo/geo.service';
import { GeoModule } from '../matching/geo/geo.module';
import { AuthModule } from '../auth/auth.module';
import { PrismaService } from '../prisma/prisma.service';

import { MapsModule } from '../maps/maps.module';

@Module({
  imports: [GeoModule, AuthModule, MapsModule],
  controllers: [FareConntroller],
  providers: [FareService, GeoService, PrismaService],
  exports: [FareService],
})
export class FareModule {}
