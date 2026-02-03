import { Global, Module, OnApplicationShutdown } from '@nestjs/common';
import { AppLogger } from '../libs/logger/app-logger.service';
import { createClient, RedisClientType } from 'redis';
import * as dotenv from 'dotenv';

dotenv.config();

let redisClient: RedisClientType | null = null;

@Global()
@Module({
  providers: [
    {
      provide: 'REDIS_CLIENT',
      useFactory: async (): Promise<RedisClientType> => {
        if (!redisClient) {
          redisClient = createClient({
            username: process.env.REDIS_USERNAME,
            password: process.env.REDIS_PASSWORD,
            socket: {
              host: process.env.REDIS_HOST,
              port: Number(process.env.REDIS_PORT) || 6389,
              ...(process.env.REDIS_TLS === 'true' && {
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
