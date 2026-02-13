import { Injectable, Logger } from '@nestjs/common';
import { OrderItemDto } from './dto/users.dto';
import * as crypto from 'crypto';

// Idempotency window (5 minutes)
const IDEMPOTENCY_WINDOW_MS = 5 * 60 * 1000;

interface IdempotencyRecord {
  orderId: string;
  timestamp: number;
}

/**
 * Idempotency Service
 * 
 * PRODUCTION NOTE: This implementation uses in-memory storage for development.
 * For production, replace with Redis using the following approach:
 * 
 * 1. Install Redis: npm install @nestjs/cache-manager cache-manager-redis-store
 * 2. Import: import { CACHE_MANAGER } from '@nestjs/cache-manager';
 * 3. Inject: constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache)
 * 4. Use Redis methods:
 *    - await this.cacheManager.get(key)
 *    - await this.cacheManager.set(key, value, TTL)
 *    - await this.cacheManager.del(key)
 * 
 * Redis ensures idempotency works across multiple server instances.
 */
@Injectable()
export class IdempotencyService {
  private readonly logger = new Logger(IdempotencyService.name);
  
  // In-memory cache (replace with Redis in production)
  private readonly cache = new Map<string, IdempotencyRecord>();

  constructor() {
    // Clean up expired records every 10 minutes
    setInterval(() => this.cleanup(), 10 * 60 * 1000);
  }

  /**
   * Generates idempotency key for order
   */
  generateKey(
    userId: string,
    addressId: string,
    restaurantId: string,
    items: OrderItemDto[]
  ): string {
    const itemsString = items
      .map(i => `${i.id}:${i.quantity}`)
      .sort()
      .join('|');
    
    const data = `${userId}:${addressId}:${restaurantId}:${itemsString}`;
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Checks for duplicate order within idempotency window
   * @returns orderId if duplicate found, null otherwise
   */
  async check(key: string): Promise<string | null> {
    // PRODUCTION: Replace with Redis
    // const record = await this.cacheManager.get<IdempotencyRecord>(key);
    
    const record = this.cache.get(key);
    
    if (record) {
      const age = Date.now() - record.timestamp;
      if (age < IDEMPOTENCY_WINDOW_MS) {
        this.logger.warn(`Duplicate order attempt detected: ${key}`);
        return record.orderId;
      }
      // Expired, remove it
      this.cache.delete(key);
    }
    
    return null;
  }

  /**
   * Stores idempotency record
   */
  async store(key: string, orderId: string): Promise<void> {
    const record: IdempotencyRecord = {
      orderId,
      timestamp: Date.now()
    };

    // PRODUCTION: Replace with Redis
    // await this.cacheManager.set(key, record, IDEMPOTENCY_WINDOW_MS);
    
    this.cache.set(key, record);
    
    this.logger.debug(`Stored idempotency key: ${key.substring(0, 16)}...`);
  }

  /**
   * Manually remove idempotency record (for testing/admin purposes)
   */
  async remove(key: string): Promise<void> {
    // PRODUCTION: Replace with Redis
    // await this.cacheManager.del(key);
    
    this.cache.delete(key);
    this.logger.debug(`Removed idempotency key: ${key.substring(0, 16)}...`);
  }

  /**
   * Cleans up expired idempotency records
   * NOTE: In production with Redis, this is handled by TTL automatically
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;

    for (const [key, record] of this.cache.entries()) {
      if (now - record.timestamp > IDEMPOTENCY_WINDOW_MS) {
        this.cache.delete(key);
        cleanedCount++;
      }
    }

    if (cleanedCount > 0) {
      this.logger.debug(`Cleaned up ${cleanedCount} expired idempotency records`);
    }
  }

  /**
   * Gets cache statistics (for monitoring)
   */
  getStats() {
    return {
      size: this.cache.size,
      windowMs: IDEMPOTENCY_WINDOW_MS,
    };
  }
}