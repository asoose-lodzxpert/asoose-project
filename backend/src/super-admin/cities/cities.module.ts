import { Module } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CitiesController } from './cities.controller';
import { CitiesService } from './cities.service';

@Module({
  controllers: [CitiesController],
  providers: [CitiesService, PrismaService],
  exports: [CitiesService],
})
export class CitiesModule {}
