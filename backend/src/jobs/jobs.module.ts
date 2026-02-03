import { Module, forwardRef } from '@nestjs/common';
import { JobsService } from './jobs.service';
import { JobsController } from './jobs.controller';
import { JobGateway } from './job.gateway';

import { RideModule } from '../ride/ride.module';
import { DeliveryModule } from '../delivery/delivery.module';

@Module({
  imports: [forwardRef(() => RideModule), forwardRef(() => DeliveryModule)],
  controllers: [JobsController],
  providers: [JobsService, JobGateway],
  exports: [JobsService, JobGateway],
})
export class JobsModule {}
