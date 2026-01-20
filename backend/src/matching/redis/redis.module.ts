import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
// 👇 Fix: Import the constant instead of defining it here
import { REDIS_CLIENT } from './redis-keys.constants'; 

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('MATCHING_REDIS_DB', 1), // Use separate DB for matching system (default: 1)
          retryStrategy: (times) => {
            const delay = Math.min(times * 50, 2000);
            return delay;
          },
          maxRetriesPerRequest: 3,
          enableReadyCheck: true,
          lazyConnect: false,
        });

        redis.on('connect', () => {
          console.log(
            '✅ Redis connected for Matching System (DB: ' +
              configService.get('MATCHING_REDIS_DB', 1) +
              ')',
          );
        });

        redis.on('error', (err) => {
          console.error('❌ Redis error:', err);
        });

        redis.on('reconnecting', () => {
          console.log('🔄 Redis reconnecting...');
        });

        return redis;
      },
      inject: [ConfigService],
    },
    RedisService,
  ],
  exports: [REDIS_CLIENT, RedisService],
})
export class RedisModule {}