import { 
    ExecutionContext, 
    Injectable, 
    UnauthorizedException,
    Logger 
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    private readonly logger = new Logger(JwtAuthGuard.name);

    handleRequest<TUser = any>(
        err: any,
        user: any,
        info: any,
        context: ExecutionContext,
    ): TUser {
        if (err || !user) {
            const request = context.switchToHttp().getRequest();
            const errorMessage = info?.message || err?.message || 'Unauthorized';
            
            this.logger.error('HTTP Auth failed:', {
                path: request.url,
                method: request.method,
                error: err?.message,
            });
            
            throw new UnauthorizedException(errorMessage);
        }
        
        return user;
    }
}