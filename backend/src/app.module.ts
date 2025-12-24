import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './users/users.module';

import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; 
import { PrismaModule } from './prisma/prisma.module';
import { MarketplaceModule } from './marketplace/marketplace.module';
import { VendorModule } from './vendor/vendor.module';
// --------------------------------------------------------------------------------

@Module({
  imports: [
    ThrottlerModule.forRoot([
        {
            ttl: 60000, 
            limit: 10,  
        }
    ]),
    ConfigModule.forRoot({ 
      isGlobal: true,
    }), 
    UsersModule,
    AuthModule,
    PrismaModule,
    MarketplaceModule,
    VendorModule
  ],
  controllers: [AppController],
  providers: [
    AppService, 
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard, 
    }
  ],
})
export class AppModule {}