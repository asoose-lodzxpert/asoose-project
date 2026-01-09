import { BullModule } from '@nestjs/bullmq';

export const EmailQueue = BullModule.registerQueue({
  name: 'email',
});
