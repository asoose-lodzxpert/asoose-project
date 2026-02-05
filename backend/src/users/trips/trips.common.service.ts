import { Injectable, Logger, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../matching/redis/redis.service';

export const TRIPS_CONFIG = {
  OTP_LENGTH: 6,
  OTP_TTL_MS: 15 * 60 * 1000,
  MAX_OTP_ATTEMPTS: 3,
  MAX_DELIVERY_WEIGHT_KG: 100,
  MIN_DELIVERY_WEIGHT_KG: 0.1,
  COMPLETION_RADIUS_KM: 0.5,
  PAGINATION_MAX_LIMIT: 50,
  PAGINATION_DEFAULT_LIMIT: 20,
  PHONE_MASK_VISIBLE_DIGITS: 4,
  MAX_TEXT_LENGTH: 500,
};

@Injectable()
export class TripsCommonService {
  private readonly logger = new Logger(TripsCommonService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
  ) {}

  round(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  maskPhoneNumber(phone: string): string {
    if (!phone || phone.length < 8) return '***';
    const visible = phone.slice(-TRIPS_CONFIG.PHONE_MASK_VISIBLE_DIGITS);
    return `***${visible}`;
  }

  sanitizeText(text?: string): string {
    return text ? text.trim().slice(0, TRIPS_CONFIG.MAX_TEXT_LENGTH) : '';
  }

  validatePagination(page: number, limit: number) {
    const safePage = Math.max(1, page || 1);
    const safeLimit = Math.min(
      Math.max(1, limit || TRIPS_CONFIG.PAGINATION_DEFAULT_LIMIT),
      TRIPS_CONFIG.PAGINATION_MAX_LIMIT,
    );
    return { page: safePage, limit: safeLimit };
  }

  async checkOtpRateLimit(entityId: string, action: string): Promise<void> {
    const key = `otp_attempts:${action}:${entityId}`;
    const client = this.redis.getClient();
    const attempts = await client.incr(key);

    if (attempts === 1) {
      await client.expire(key, 60 * 15);
    }
    if (attempts > TRIPS_CONFIG.MAX_OTP_ATTEMPTS) {
      throw new ForbiddenException(
        'Too many failed OTP attempts. Please try again later.',
      );
    }
  }

  async logActivity(
    userId: string,
    action: string,
    metadata: Record<string, any>,
  ) {
    try {
      const safeMetadata = JSON.parse(
        JSON.stringify(metadata, (key, value) => {
          if (['phone', 'email', 'password', 'token'].includes(key))
            return '***';
          return value;
        }),
      );

      await this.prisma.activityLog.create({
        data: {
          userId,
          action,
          details: JSON.stringify(safeMetadata),
          createdAt: new Date(),
        },
      });
    } catch (error) {
      this.logger.error(`Failed to create audit log for ${action}`, error);
    }
  }
}
