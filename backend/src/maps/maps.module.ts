import { Module } from '@nestjs/common';
import { LoggerModule } from '../libs/logger/logger.module';
import { PrismaModule } from '../prisma/prisma.module';
import { MapsController } from './maps.controller';
import { MapsService } from './maps.service';

@Module({
  imports: [LoggerModule, PrismaModule],
  controllers: [MapsController],
  providers: [MapsService],
  exports: [MapsService],
})
export class MapsModule {}
