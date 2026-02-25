import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AppLogger } from '../libs/logger/app-logger.service';
import { createClient, RedisClientType } from 'redis';

let redisClient: RedisClientType | null = null;

@Global()
@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'REDIS_CLIENT',
      inject: [ConfigService],
      useFactory: async (cs: ConfigService): Promise<RedisClientType> => {
        if (!redisClient) {
          redisClient = createClient({
            username: cs.get<string>('REDIS_USERNAME'),
            password: cs.get<string>('REDIS_PASSWORD'),
            socket: {
              host: cs.get<string>('REDIS_HOST', 'localhost'),
              port: cs.get<number>('REDIS_PORT', 6379),
              ...(cs.get<string>('REDIS_TLS') === 'true' && {
                tls: true,
              }),
            },
          });
          const appLogger = new AppLogger();
          redisClient.on('error', (err) =>
            appLogger.error('Redis Client Error', err?.stack, { error: err }),
          );
          await redisClient.connect();
          appLogger.log('✅ Redis connected!');
        }
        return redisClient;
      },
    },
  ],
  exports: ['REDIS_CLIENT'],
})
export class RedisModule implements OnApplicationShutdown {
  async onApplicationShutdown(signal?: string) {
    if (redisClient) {
      await redisClient.disconnect();
      const appLogger = new AppLogger();
      appLogger.log('Redis disconnected on shutdown');
    }
  }
}
