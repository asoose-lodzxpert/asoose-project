import { MiddlewareConsumer, Module } from '@nestjs/common';
// 1. IMPORT APP_GUARD from @nestjs/core
import { APP_GUARD } from '@nestjs/core'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';

// Assuming StrictThrottlerGuard is your custom guard or the ThrottlerGuard
import { StrictThrottlerGuard } from './auth/guards/strict-throttler.guard'; 

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
      // APP_GUARD is now imported
      provide: APP_GUARD, 
      // StrictThrottlerGuard is now imported
      useClass: StrictThrottlerGuard, 
    }
  ],
})
export class AppModule {}