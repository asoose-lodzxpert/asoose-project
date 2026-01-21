import { Module, Global } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RedisService } from './redis.service';
import { MATCHING_REDIS_CLIENT } from './redis.constants';

export { MATCHING_REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: MATCHING_REDIS_CLIENT,
      useFactory: (configService: ConfigService) => {
        const redis = new Redis({
          host: configService.get('REDIS_HOST', 'localhost'),
          port: configService.get('REDIS_PORT', 6379),
          password: configService.get('REDIS_PASSWORD'),
          db: configService.get('MATCHING_REDIS_DB', 1),
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
  exports: [MATCHING_REDIS_CLIENT, RedisService],
})
export class MatchingRedisModule {}
