import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt-strategy';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OtpModule } from './otp.module';
import {
  AuthController,
  DriverAuthController,
  RiderAuthController,
  UserAuthController,
} from './auth.controller';
import { VendorAuthController } from './vendor-auth.controller';
import { VendorAuthService } from './vendor-auth.service';
import { AuthService } from './auth.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret:
          configService.get<string>('JWT_SECRET') ||
          'your-secret-key-change-in-production',
        signOptions: { expiresIn: '7d' },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    OtpModule,
    MailModule,
  ],

  controllers: [
    AuthController,
    UserAuthController,
    RiderAuthController,
    DriverAuthController,
    VendorAuthController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    VendorAuthService,
    PrismaModule,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    VendorAuthService,
    PassportModule,
    JwtModule,
  ],
})
export class AuthModule {}
