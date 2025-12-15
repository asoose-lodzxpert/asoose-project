import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { CorrelationMiddleware } from './libs/logger/correlation.middleware';
import { APP_GUARD } from '@nestjs/core';
import { StrictThrottlerGuard } from './libs/rate-limit/strict-throttle.guard';
import { RedisModule } from './libs/redis/redis.module';

@Module({
  imports: [RedisModule, 
    ConfigModule.forRoot({ 
      isGlobal: true,
    }), 
    UsersModule,
        AuthModule,],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: StrictThrottlerGuard,
  },],
})
export class AppModule {}

export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
