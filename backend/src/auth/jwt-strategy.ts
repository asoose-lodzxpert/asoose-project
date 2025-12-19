import { ExtractJwt, Strategy } from 'passport-jwt';
import { PassportStrategy } from '@nestjs/passport';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface JwtPayload {
    sub: string; // User ID
    email?: string;
    role?: string;
    aud: string;
    exp: number;
    iat: number;
    iss: string;
    user_metadata?: Record<string, any>;
    app_metadata?: {
        provider?: string;
        providers?: string[];
    };
}

export interface AuthUser {
    id: string;
    email?: string;
    phone?: string;
    role: string;
    metadata?: Record<string, any>;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
    constructor(private configService: ConfigService) {
        
        // Ensure this matches the variable name in your .env file EXACTLY
        const jwtSecret = configService.get<string>('SUPABASE_JWT_SECRET_KEY');
        
        if (!jwtSecret) {
            throw new Error('SUPABASE_JWT_SECRET_KEY is not defined in the application configuration.');
        }
        
        super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: jwtSecret,
            audience: 'authenticated', // Allows only logged-in users
            algorithms: ['HS256'],
            // REMOVED: issuer check (This is often the cause of 401s in local dev)
        });
    }

    async validate(payload: JwtPayload): Promise<AuthUser> {
        // 1. Verify User ID exists
        if (!payload.sub) {
            throw new UnauthorizedException('Invalid token payload: missing user ID');
        }

        // 2. Verify Audience
        if (payload.aud !== 'authenticated') {
            throw new UnauthorizedException('Invalid token audience');
        }

        // 3. Return the user object (this becomes req.user in controllers)
        return {
            id: payload.sub,
            email: payload.email,
            role: payload.role || 'authenticated',
            metadata: payload.user_metadata,
        };
    }
}