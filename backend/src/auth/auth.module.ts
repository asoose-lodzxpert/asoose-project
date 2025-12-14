import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt-strategy';
@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('SUPABASE_JWT_SECRET_KEY'), 
      }),
      inject: [ConfigService],
    }),
    ConfigModule, 
  ],
  
  providers: [
   
    JwtStrategy, 
    JwtAuthGuard, 
  ],
  exports: [
   
    JwtStrategy, 
    JwtAuthGuard, 
    PassportModule, 
    JwtModule,
  ],
})
export class AuthModule {}