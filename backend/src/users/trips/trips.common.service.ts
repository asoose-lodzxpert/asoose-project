import {
  Injectable,
  Logger,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../matching/redis/redis.service';
import { MapsService } from '../../maps/maps.service';
import { LocationPayloadDto } from './dto/trip.dto';

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

  // ✅ ADDED: Strict Geofence boundaries (Update these coordinates to match your actual operating region, e.g., Abuja)
  private readonly GEOFENCE_BOUNDS = {
    minLat: 8.9,
    maxLat: 9.2, // Example Abuja bounds (approximate)
    minLng: 7.3,
    maxLng: 7.6,
  };

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mapsService: MapsService, // ✅ Injected MapsService
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

  // ✅ ADDED: Geofence Validator
  validateGeofence(lat: number, lng: number) {
    if (
      lat < this.GEOFENCE_BOUNDS.minLat ||
      lat > this.GEOFENCE_BOUNDS.maxLat ||
      lng < this.GEOFENCE_BOUNDS.minLng ||
      lng > this.GEOFENCE_BOUNDS.maxLng
    ) {
      throw new BadRequestException(
        `Location (${lat}, ${lng}) is outside our active service area.`,
      );
    }
  }

  // ✅ ADDED: Secure Location Resolver (Source of Truth)
  async resolveSecureLocation(
    dto: LocationPayloadDto,
  ): Promise<{ lat: number; lng: number; address: string }> {
    let resolved;

    if (dto.placeId) {
      // 1. Primary Source of Truth: Google Place ID
      resolved = await this.mapsService.geocodePlace(dto.placeId);
    } else if (dto.lat && dto.lng) {
      // 2. Fallback: Snap raw GPS coordinates to trusted road network via Reverse Geocoding
      resolved = await this.mapsService.reverseGeocode(dto.lat, dto.lng);
    } else {
      throw new BadRequestException(
        'Invalid location payload. Provide placeId or coordinates.',
      );
    }

    // 3. Security Check: Enforce boundaries before billing/dispatching
    this.validateGeofence(resolved.lat, resolved.lng);

    return {
      lat: resolved.lat,
      lng: resolved.lng,
      address: resolved.address, // Overrides the client's textual address to prevent spoofing
    };
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
