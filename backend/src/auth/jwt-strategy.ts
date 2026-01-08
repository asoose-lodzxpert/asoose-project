import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { UserRole } from '@prisma/client';

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
    const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET_KEY');
    
    if (!jwtSecret) {
      throw new Error('SUPABASE_JWT_SECRET_KEY is not defined.');
    }
    
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
      audience: 'authenticated',
      algorithms: ['HS256'],
    });
  }

  async validate(payload: JwtPayload): Promise<AuthUser> {
    
    if (!payload.sub) {
      throw new UnauthorizedException('Invalid token');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { 
        id: true, 
        email: true, 
        role: true, 
        status: true,
        deletedAt: true
      } 
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 1. Block Banned/Suspended Users
    if (user.status === 'BANNED' || user.status === 'SUSPENDED') {
      throw new UnauthorizedException('Invalid credentials');
    }

    // 2. Block Soft Deleted Users
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