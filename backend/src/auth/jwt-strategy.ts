import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '../common/enums/user-role.enum';

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
    configService: ConfigService,
    private prisma: PrismaService,
  ) {
    const jwtSecret = configService.get<string>('JWT_SECRET');

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
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }
    const role = payload.role;
    if (role === 'RIDER' || role === 'DRIVER') {
      const rider = await this.prisma.rider.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          status: true,
          role: true,
        },
      });
      if (!rider) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // It's okay to allow the rider even if status is BANNED or SUSPENDED;
      // the frontend will inform the rider appropriately.
      // if (rider.status === 'BANNED' || rider.status === 'SUSPENDED') {
      //   throw new UnauthorizedException('Invalid credentials');
      // }

      if (rider.role !== role) {
        throw new UnauthorizedException('Role mismatch');
      }

      return {
        id: rider.id,
        email: rider.email ?? undefined,
        role: rider.role,
      };
    }

    if (role === 'VENDOR') {
      const vendor = await this.prisma.vendor.findUnique({
        where: { id: payload.sub },
        select: {
          id: true,
          email: true,
          status: true,
        },
      });
      if (!vendor) {
        throw new UnauthorizedException('Invalid credentials');
      }

      // It's okay to allow the vendor even if status is BANNED or SUSPENDED;
      // the frontend will inform the vendor appropriately.
      // if (vendor.status === 'BANNED' || vendor.status === 'SUSPENDED') {
      //   throw new UnauthorizedException('Invalid credentials');
      // }

      return {
        id: vendor.id,
        email: vendor.email ?? undefined,
        role: UserRole.VENDOR,
      };
    }
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
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.deletedAt) {
      throw new UnauthorizedException('Account deleted');
    }
    return {
      id: user.id,
      email: user.email ?? undefined,
      role: user.role,
    };
  }
}
