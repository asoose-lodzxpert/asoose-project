import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Redis } from 'ioredis';

@Injectable()
export class IpBanGuard implements CanActivate {
  constructor(private readonly redis: Redis) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const ip = req.ip;

    const banned = await this.redis.get(`ban:ip:${ip}`);
    if (banned) {
      throw new ForbiddenException('IP temporarily banned');
    }

    return true;
  }
}
