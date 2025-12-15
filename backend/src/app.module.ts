import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
<<<<<<< HEAD
import { CorrelationMiddleware } from './libs/logger/correlation.middleware';
import { APP_GUARD } from '@nestjs/core';
import { StrictThrottlerGuard } from './libs/rate-limit/strict-throttle.guard';
import { RedisModule } from './libs/redis/redis.module';

@Module({
  imports: [RedisModule],
=======
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
    }), 
    UsersModule,
        AuthModule,
  ],
>>>>>>> auth
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: StrictThrottlerGuard,
  },],
})
<<<<<<< HEAD

export class AppModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(CorrelationMiddleware).forRoutes('*');
  }
}
=======
export class AppModule {}
>>>>>>> auth
