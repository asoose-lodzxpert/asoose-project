import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => ({
        throttlers: [
          { limit: 20, ttl: 60 * 1000 },
        ],
        storage: new ThrottlerStorageRedisService(
          new Redis(process.env.REDIS_URL!),
        ),
      }),
    }),
  ],
})
export class RateLimitModule {}
