import { Module } from '@nestjs/common';
import { ThrottlerModule } from '@nestjs/throttler';
import Redis from 'ioredis';
import { ThrottlerStorageRedisService } from '@nest-lab/throttler-storage-redis';

@Module({
  imports: [
    ThrottlerModule.forRootAsync({
      useFactory: () => {
        // Construct Redis connection from environment variables
        const redis = new Redis({
          host: process.env.REDIS_HOST || 'localhost',
          port: Number(process.env.REDIS_PORT) || 6379,
          password: process.env.REDIS_PASSWORD || undefined,
          db: Number(process.env.REDIS_DB) || 0,
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
        });

        return {
          throttlers: [{ limit: 20, ttl: 60 * 1000 }],
          storage: new ThrottlerStorageRedisService(redis),
        };
      },
    }),
  ],
})
export class RateLimitModule {}
