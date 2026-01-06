import { MiddlewareConsumer, Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core'; 
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler'; 
import { PrismaModule } from './prisma/prisma.module';
import { SuperAdminModule } from './super-admin/super-admin.module';
import { QueueModule } from './libs/queue/queue.module';
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
    AuthModule,
    SuperAdminModule,
    PrismaModule,
    QueueModule,
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
