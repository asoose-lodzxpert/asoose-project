import { Inject, Injectable, Logger } from '@nestjs/common';
import { OrderItemDto } from './dto/users.dto';
import type { RedisClientType } from 'redis';
import * as crypto from 'crypto';

// Idempotency TTL in seconds (5 minutes)
const IDEMPOTENCY_TTL_SECONDS = 5 * 60;

/**
 * Idempotency Service
 *
 * Uses the global REDIS_CLIENT to store idempotency keys with TTL so that
 * duplicate order submissions within a 5-minute window are rejected safely
 * across all server instances.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);

  constructor(
    @Inject('REDIS_CLIENT') private readonly redis: RedisClientType,
  ) {}

  /**
   * Generates an idempotency key for an order based on its contents.
   */
  generateKey(
    userId: string,
    addressId: string,
    restaurantId: string,
    items: OrderItemDto[],
  ): string {
    const itemsString = items
      .map((i) => `${i.id}:${i.quantity}`)
      .sort()
      .join('|');

    const data = `${userId}:${addressId}:${restaurantId}:${itemsString}`;
    return `idempotency:order:${crypto.createHash('sha256').update(data).digest('hex')}`;
  }

  /**
   * Checks for a duplicate order within the idempotency window.
   * @returns orderId if a duplicate is found, null otherwise
   */
  async check(key: string): Promise<string | null> {
    const value = await this.redis.get(key);
    if (value) {
      this.logger.warn(
        `Duplicate order attempt detected: ${key.substring(0, 32)}...`,
      );
      return value;
    }
    return null;
  }

  /**
   * Stores an idempotency record with automatic TTL expiry.
   */
  async store(key: string, orderId: string): Promise<void> {
    // NX = only set if key does not exist (atomic guard)
    await this.redis.set(key, orderId, {
      EX: IDEMPOTENCY_TTL_SECONDS,
      NX: true,
    });
    this.logger.debug(`Stored idempotency key: ${key.substring(0, 32)}...`);
  }

  /**
   * Manually removes an idempotency record (for testing/admin purposes).
   */
  async remove(key: string): Promise<void> {
    await this.redis.del(key);
    this.logger.debug(`Removed idempotency key: ${key.substring(0, 32)}...`);
  }
}
