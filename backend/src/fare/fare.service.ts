import { Injectable, Logger } from '@nestjs/common';
import { RideFareDto } from './dto/ride-fare-dto';
import { DeliveryFareDto } from './dto/delivery-fare-dto';
import { GeoService } from '../matching/geo/geo.service';
import { PrismaService } from '../prisma/prisma.service';

type DistanceResult = {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
};

@Injectable()
export class FareService {
  private readonly logger = new Logger(FareService.name);

  constructor(
    private readonly geoService: GeoService,
    private readonly prisma: PrismaService,
  ) {}

  // ── Hardcoded fallback constants (used when DB setting is not found) ─────────
  // Ride
  readonly DefaultBaseRideFare = 1000;
  readonly DefaultRiderPerKm = 700;
  readonly DefaultNightSurchargePerKm = 1000;
  // Delivery
  readonly DefaultBaseDeliveryFare = 700;
  readonly DefaultDeliveryPerKm = 400;

  /**
   * Reads a numeric system setting from the DB.
   * Falls back to the provided default if the key is missing or not a number.
   */
  private async getSetting(key: string, fallback: number): Promise<number> {
    try {
      const setting = await this.prisma.systemSetting.findUnique({
        where: { key },
      });
      if (setting?.value) {
        const parsed = parseFloat(setting.value);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
    } catch (err) {
      this.logger.warn(
        `Could not read setting "${key}", using default ${fallback}`,
        err,
      );
    }
    return fallback;
  }

  /**
   * Returns an object with price (number), distance (meters + text) and eta (seconds + text).
   * Fare constants are read from admin-set system settings with hardcoded defaults as fallback.
   */
  async getRideFare(dto: RideFareDto) {
    const { pickuplat, pickuplong, dropofflat, dropofflong } = dto;

    // Load admin-configured fare rates (or fall back to hardcoded defaults)
    const [baseRideFare, riderPerKm, nightSurchargePerKm] = await Promise.all([
      this.getSetting('ride_base_fare', this.DefaultBaseRideFare),
      this.getSetting('ride_per_km', this.DefaultRiderPerKm),
      this.getSetting(
        'ride_night_surcharge_per_km',
        this.DefaultNightSurchargePerKm,
      ),
    ]);

    const lat1 = Number(pickuplat);
    const lng1 = Number(pickuplong);
    const lat2 = Number(dropofflat);
    const lng2 = Number(dropofflong);
    const distanceKm = this.geoService.calculateDistance(
      lat1,
      lng1,
      lat2,
      lng2,
    );
    const distanceMeters = Math.round(distanceKm * 1000);

    const durationSeconds = Math.round(distanceKm * 180); // ~3 min/km
    const durationText = `${Math.round(durationSeconds / 60)} min`;
    const distanceText = `${distanceKm.toFixed(2)} km`;

    // After 10 PM (Africa/Lagos) apply admin-configured night surcharge rate
    const now = new Date();
    const lagosTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    );
    const hour = lagosTime.getHours();
    const isNightRate = hour >= 22;
    const perKm = isNightRate ? nightSurchargePerKm : riderPerKm;

    const variableFare = Math.round(distanceKm * perKm);
    const economyPrice = baseRideFare + variableFare;
    const businessPrice = Math.round(economyPrice * 1.5);

    const price = dto.vehicleType === 'BUSINESS' ? businessPrice : economyPrice;

    return {
      price,
      economyPrice,
      businessPrice,
      isNightRate,
      nightSurchargePerKm: isNightRate ? nightSurchargePerKm : undefined,
      distance: { meters: distanceMeters, text: distanceText },
      eta: { seconds: durationSeconds, text: durationText },
    };
  }

  async getDeliveryFare(dto: DeliveryFareDto) {
    const { pickuplat, pickuplong, dropofflat, dropofflong } = dto;

    // Load admin-configured delivery fare rates (or fall back to hardcoded defaults)
    const [baseDeliveryFare, deliveryPerKm] = await Promise.all([
      this.getSetting('delivery_base_fare', this.DefaultBaseDeliveryFare),
      this.getSetting('delivery_per_km', this.DefaultDeliveryPerKm),
    ]);

    const lat1 = Number(pickuplat);
    const lng1 = Number(pickuplong);
    const lat2 = Number(dropofflat);
    const lng2 = Number(dropofflong);
    const distanceKm = this.geoService.calculateDistance(
      lat1,
      lng1,
      lat2,
      lng2,
    );
    const distanceMeters = Math.round(distanceKm * 1000);

    const durationSeconds = Math.round(distanceKm * 180);
    const durationText = `${Math.round(durationSeconds / 60)} min`;
    const distanceText = `${distanceKm.toFixed(2)} km`;

    const variableFare = Math.round(distanceKm * deliveryPerKm);
    const price = baseDeliveryFare + variableFare;

    return {
      price,
      distance: { meters: distanceMeters, text: distanceText },
      eta: { seconds: durationSeconds, text: durationText },
    };
  }

  /**
   * Calculates the delivery fee for a given distance using admin-configured
   * DB settings (delivery_base_fare + delivery_per_km). Falls back to
   * hardcoded defaults if the settings are not found.
   *
   * Use this in place of the synchronous getter accessors below.
   */
  async calcDeliveryFee(distanceKm: number): Promise<number> {
    const [baseFare, perKm] = await Promise.all([
      this.getSetting('delivery_base_fare', this.DefaultBaseDeliveryFare),
      this.getSetting('delivery_per_km', this.DefaultDeliveryPerKm),
    ]);
    const fee = Math.round(baseFare + distanceKm * perKm);
    return Math.max(fee, baseFare);
  }

  // ── Convenience accessors (kept for backward-compat; prefer calcDeliveryFee) ─
  get BaseRideFare() {
    return this.DefaultBaseRideFare;
  }
  get RiderPerKm() {
    return this.DefaultRiderPerKm;
  }
  get BaseDeliveryFare() {
    return this.DefaultBaseDeliveryFare;
  }
  get DeliveryPerKm() {
    return this.DefaultDeliveryPerKm;
  }
}
