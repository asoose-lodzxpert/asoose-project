import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';
import { appLogger } from 'src/libs/logger/logger';

export interface JwtPayload {
  sub: string;
  email?: string;
  role?: string;
  aud: string;
  exp: number;
  iat: number;
  iss: string;
}

export interface AuthUser {
  id: string;
  email?: string;
  role: UserRole;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret =
      configService.get<string>('JWT_SECRET') ||
      'your-secret-key-change-in-production';

    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined.');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    appLogger.log('=== JWT Strategy - Validate ===');
    appLogger.log('Full Payload:', JSON.stringify(payload, null, 2));
    appLogger.log(`Payload.sub: ${payload.sub}`);
    appLogger.log(`Payload.role: ${payload.role}`);
    appLogger.log(`Payload.email: ${payload.email}`);

    if (!payload.sub) {
      appLogger.error('JWT Validation Failed: No sub in payload');
      throw new UnauthorizedException('Invalid token');
    }

    // Extract role from payload (should be set during token generation)
    const role = payload.role;
    appLogger.log(`Determined role: ${role}`);

    // If role is specified in token, query the correct table directly
    if (role === 'RIDER') {
      appLogger.log('Looking up RIDER in database...');
      const rider = await this.prisma.rider.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });

      if (!rider) {
        appLogger.error(`RIDER not found with id: ${payload.sub}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (rider.status === 'BANNED' || rider.status === 'SUSPENDED') {
        appLogger.error(`RIDER status check failed: ${rider.status}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      appLogger.log(`RIDER authenticated successfully: ${rider.id}`);
      return {
        id: rider.id,
        email: rider.email ?? undefined,
        role: UserRole.RIDER,
      };
    }

    if (role === 'VENDOR') {
      appLogger.log('Looking up VENDOR in database...');
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });

      if (!vendor) {
        appLogger.error(`VENDOR not found with id: ${payload.sub}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      if (vendor.status === 'BANNED' || vendor.status === 'SUSPENDED') {
        appLogger.error(`VENDOR status check failed: ${vendor.status}`);
        throw new UnauthorizedException('Invalid credentials');
      }

      appLogger.log(`VENDOR authenticated successfully: ${vendor.id}`);
      return {
        id: vendor.id,
        email: vendor.email ?? undefined,
        role: UserRole.VENDOR,
      };
    }

    // Default to User table for CUSTOMER, ADMIN, SUPER_ADMIN, etc.
    appLogger.log('Looking up USER in database...');
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        deletedAt: true,
      },
    });

    if (!user) {
      appLogger.error(`USER not found with id: ${payload.sub}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Block Banned/Suspended Users
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      appLogger.error(`USER status check failed: ${user.status}`);
      throw new UnauthorizedException('Invalid credentials');
    }

    // Block Soft Deleted Users
    if (user.deletedAt) {
      appLogger.error(`USER is soft deleted: ${user.deletedAt}`);
      throw new UnauthorizedException('Account deleted');
    }

    appLogger.log(`USER authenticated successfully: ${user.id}`);
    return {
      id: user.id,
      email: user.email ?? undefined,
      role: user.role,
    };
  }
}
