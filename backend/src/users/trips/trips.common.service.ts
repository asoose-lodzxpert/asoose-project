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

  // Cache service zones for 5 minutes to avoid DB hits on every request
  private serviceZonesCache: { zones: Array<{ name: string; coordinates: Array<{ lat: number; lng: number }> }>; expiresAt: number } | null = null;
  private readonly CACHE_TTL_MS = 5 * 60 * 1000;

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly mapsService: MapsService,
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

  // ── Geofence Validation (DB-backed ServiceZone polygons) ──

  /**
   * Load active service zones from DB with in-memory cache.
   */
  private async getActiveServiceZones(): Promise<Array<{ name: string; coordinates: Array<{ lat: number; lng: number }> }>> {
    const now = Date.now();
    if (this.serviceZonesCache && now < this.serviceZonesCache.expiresAt) {
      return this.serviceZonesCache.zones;
    }

    const zones = await this.prisma.serviceZone.findMany({
      where: { isActive: true },
      select: { name: true, coordinates: true },
    });

    const parsed = zones.map((z) => ({
      name: z.name,
      coordinates: z.coordinates as Array<{ lat: number; lng: number }>,
    }));

    this.serviceZonesCache = { zones: parsed, expiresAt: now + this.CACHE_TTL_MS };
    this.logger.log(`Loaded ${parsed.length} active service zone(s): ${parsed.map(z => z.name).join(', ')}`);
    return parsed;
  }

  /**
   * Ray-casting point-in-polygon test.
   * Returns true if (lat, lng) is inside the polygon defined by `vertices`.
   */
  private isPointInPolygon(lat: number, lng: number, vertices: Array<{ lat: number; lng: number }>): boolean {
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
      const xi = vertices[i].lat, yi = vertices[i].lng;
      const xj = vertices[j].lat, yj = vertices[j].lng;

      const intersect = ((yi > lng) !== (yj > lng)) &&
        (lat < (xj - xi) * (lng - yi) / (yj - yi) + xi);
      if (intersect) inside = !inside;
    }
    return inside;
  }

  /**
   * Validates that a coordinate falls within at least one active ServiceZone.
   * Throws BadRequestException if outside all zones.
   */
  async validateGeofence(lat: number, lng: number): Promise<void> {
    // Basic range check
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      throw new BadRequestException(`Invalid coordinates: (${lat}, ${lng})`);
    }

    const zones = await this.getActiveServiceZones();

    // If no zones are configured, allow all valid coordinates (fail-open for new deployments)
    if (zones.length === 0) {
      this.logger.warn('No active service zones configured — allowing all coordinates');
      return;
    }

    for (const zone of zones) {
      if (this.isPointInPolygon(lat, lng, zone.coordinates)) {
        return; // Inside at least one zone
      }
    }

    this.logger.warn(
      `Geofence rejected: (${lat}, ${lng}) outside all ${zones.length} active zone(s)`,
      { coordinate: { lat, lng }, zones: zones.map(z => z.name) },
    );
    throw new BadRequestException(
      `Location (${lat}, ${lng}) is outside our active service area. We currently serve: ${zones.map(z => z.name).join(', ')}.`,
    );
  }

  // ✅ ADDED: Secure Location Resolver (Source of Truth)
  async resolveSecureLocation(
    dto: LocationPayloadDto,
  ): Promise<{ lat: number; lng: number; address: string }> {
    let resolved;

    if (dto.placeId) {
      // 1. Primary Source of Truth: Google Place ID
      resolved = await this.mapsService.geocodePlace(dto.placeId);
      this.logger.debug(`Resolved placeId ${dto.placeId} to (${resolved.lat}, ${resolved.lng})`);
    } else if (dto.lat && dto.lng) {
      // 2. Fallback: Snap raw GPS coordinates to trusted road network via Reverse Geocoding
      this.logger.debug(`Resolving raw coordinates (${dto.lat}, ${dto.lng}) via reverse geocoding`);
      resolved = await this.mapsService.reverseGeocode(dto.lat, dto.lng);
      this.logger.debug(`Reverse geocoding snapped to (${resolved.lat}, ${resolved.lng})`);
    } else {
      throw new BadRequestException(
        'Invalid location payload. Provide placeId or coordinates.',
      );
    }

    // 3. Security Check: Enforce boundaries before billing/dispatching
    await this.validateGeofence(resolved.lat, resolved.lng);

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
