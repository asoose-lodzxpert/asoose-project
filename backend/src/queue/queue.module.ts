import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    BullModule.forRoot({
      connection: {
        host: process.env.REDIS_HOST || 'localhost',
        port: Number(process.env.REDIS_PORT) || 6379,
        username: process.env.REDIS_USERNAME || undefined,
        password: process.env.REDIS_PASSWORD || undefined,
        ...(process.env.REDIS_TLS === 'true' && {
          tls: { servername: process.env.REDIS_HOST },
        }),
        maxRetriesPerRequest: null,
        enableReadyCheck: true,
      },
    }),
  ],
})
export class QueueModule {}
