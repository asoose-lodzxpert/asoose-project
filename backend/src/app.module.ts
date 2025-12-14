import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { CorrelationMiddleware } from './libs/logger/correlation.middleware';
import { APP_GUARD } from '@nestjs/core';
import { StrictThrottlerGuard } from './libs/rate-limit/strict-throttle.guard';

@Module({
  imports: [],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: StrictThrottlerGuard,
  },],
})
export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}