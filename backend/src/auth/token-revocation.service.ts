import { Inject, Injectable, Logger } from '@nestjs/common';
import type { RedisClientType } from 'redis';

// How long a revocation lives — set longer than the JWT lifetime (7d + buffer)
const REVOCATION_TTL_SECONDS = 8 * 24 * 60 * 60; // 8 days

/**
 * TokenRevocationService
 *
 * Stores a Redis key `revoked:user:{userId}` when a rider/vendor is banned or
 * suspended so that their active socket connections are immediately invalidated
 * on the next gateway connection check.
 *
 * Uses the global REDIS_CLIENT (node-redis) which is available everywhere.
 */
@Injectable()
export class TokenRevocationService {
  private readonly logger = new Logger(TokenRevocationService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  /**
   * Revoke all sessions for a user. Any new socket connection from this user
   * will be rejected until the revocation expires or is explicitly cleared.
   */
  async revokeUser(
    userId: string,
    ttlSeconds: number = REVOCATION_TTL_SECONDS,
  ): Promise<void> {
    await this.redis.set(`revoked:user:${userId}`, '1', { EX: ttlSeconds });
    this.logger.warn(
      `Revoked sessions for user ${userId} (TTL ${ttlSeconds}s)`,
    );
  }

  /**
   * Check whether a user's sessions have been revoked.
   */
  async isUserRevoked(userId: string): Promise<boolean> {
    const val = await this.redis.get(`revoked:user:${userId}`);
    return val === '1';
  }

  /**
   * Clear a revocation (e.g. when reinstating a previously banned rider).
   */
  async clearRevocation(userId: string): Promise<void> {
    await this.redis.del(`revoked:user:${userId}`);
    this.logger.log(`Cleared revocation for user ${userId}`);
  }
}
