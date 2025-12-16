import { MiddlewareConsumer, Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { APP_GUARD } from '@nestjs/core';
import { StrictThrottlerGuard } from './libs/rate-limit/strict-throttle.guard';

@Module({
  imports: [
    ConfigModule.forRoot({ 
      isGlobal: true,
    }), 
    UsersModule,
        AuthModule,
  ],
  controllers: [AppController],
  providers: [AppService, {
    provide: APP_GUARD,
    useClass: StrictThrottlerGuard,
  },],
})
export class AppModule {}
