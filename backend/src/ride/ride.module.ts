import { Module, forwardRef } from '@nestjs/common';
import { RideService } from './ride.service';
import { PrismaModule } from '../prisma/prisma.module';
import { RidersModule } from '../riders/riders.module';

@Module({
  imports: [PrismaModule, forwardRef(() => RidersModule)],
  providers: [RideService],
  exports: [RideService],
})
export class RideModule {}
