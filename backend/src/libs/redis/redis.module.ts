import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

export const REDIS = 'REDIS';

@Global()
@Module({
  providers: [
    {
      provide: REDIS,
      useFactory: () => {
        return new Redis(process.env.REDIS_URL!, {
          enableReadyCheck: true,
          maxRetriesPerRequest: null,
        });
      },
    },
  ],
  exports: [REDIS],
})
export class RedisModule {}
