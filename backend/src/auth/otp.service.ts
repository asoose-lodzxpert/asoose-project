import { Injectable, Inject } from '@nestjs/common';
import type { RedisClientType } from 'redis';
import { randomInt } from 'crypto';

@Injectable()
export class OtpService {
  constructor(
    @Inject('REDIS_CLIENT') private readonly redisClient: RedisClientType,
  ) {}

  async generateOtp(key: string, ttlSeconds = 300): Promise<string> {
    const otp = String(randomInt(100000, 999999));
    await this.redisClient.set(`otp:${key}`, otp, { EX: ttlSeconds });
    return otp;
  }

  async verifyOtp(key: string, otp: string): Promise<boolean> {
    const storedOtp = await this.redisClient.get(`otp:${key}`);
    return storedOtp === otp;
  }

  async clearOtp(key: string): Promise<void> {
    await this.redisClient.del(`otp:${key}`);
  }
}
