import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';
import { StrictThrottlerGuard } from './libs/rate-limit/strict-throttle.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    UsersModule,
    AuthModule,
    // You must also import the ThrottlerModule if using the official package:
    // ThrottlerModule.forRoot([{
    //   ttl: 60000,
    //   limit: 10,
    // }]),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: StrictThrottlerGuard,
    },
  ],
})
export class AppModule {}
