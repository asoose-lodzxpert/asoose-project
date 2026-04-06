import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtStrategy } from './jwt-strategy';
import { PrismaModule } from 'src/prisma/prisma.module';
import { OtpModule } from './otp.module';
import { AuthController, UserAuthController } from './auth.controller';
import { VendorAuthController } from './vendor-auth.controller';
import { VendorAuthService } from './vendor-auth.service';
import { RiderAuthController } from './rider-auth.controller';
import { RiderAuthService } from './rider-auth.service';
import { AuthService } from './auth.service';
import { MailModule } from 'src/mail/mail.module';
import { StorageModule } from 'src/storage/storage.module';
import { TokenRevocationService } from './token-revocation.service';

@Module({
  imports: [
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.getOrThrow<string>('JWT_SECRET'),
        signOptions: {
          expiresIn: '7d',
          audience: 'asoose-app',
          issuer: 'asoose-api',
        },
      }),
      inject: [ConfigService],
    }),
    ConfigModule,
    OtpModule,
    MailModule,
    PrismaModule,
    StorageModule,
  ],

  controllers: [
    AuthController,
    UserAuthController,
    RiderAuthController,
    VendorAuthController,
  ],
  providers: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    VendorAuthService,
    RiderAuthService,
    TokenRevocationService,
  ],
  exports: [
    AuthService,
    JwtStrategy,
    JwtAuthGuard,
    VendorAuthService,
    RiderAuthService,
    PassportModule,
    JwtModule,
    TokenRevocationService,
  ],
})
export class AuthModule {}
