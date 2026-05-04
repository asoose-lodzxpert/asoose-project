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
  ) { }

  // ── Hardcoded fallback constants (used when DB setting is not found) ─────────
  // Ride
  readonly DefaultBaseRideFare = 1000;
  readonly DefaultRiderPerKm = 700;
  readonly DefaultNightSurchargePerKm = 1000;
  // Delivery
  readonly DefaultBaseDeliveryFare = 700;
  readonly DefaultDeliveryPerKm = 400;

  // Airport locations for internal geofencing check
  private readonly AIRPORT_LOCATIONS = [
    { name: 'Nnamdi Azikiwe International Airport (ABV)', lat: 9.00667, lng: 7.26306 },
    { name: 'Maiduguri International Airport (MIU)', lat: 11.8542, lng: 13.0807 },
  ];
  private readonly AIRPORT_RADIUS_KM = 3.0; // 3km radius

  private isAirportDropoff(lat: number, lng: number): boolean {
    for (const airport of this.AIRPORT_LOCATIONS) {
      const distance = this.geoService.calculateDistance(lat, lng, airport.lat, airport.lng);
      if (distance <= this.AIRPORT_RADIUS_KM) {
        return true;
      }
    }
    return false;
  }

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

    const isAirportDrop = this.isAirportDropoff(lat2, lng2);

    let economyPrice = 0;

    if (isAirportDrop) {
      if (distanceKm <= 10) {
        economyPrice = 10000;
      } else {
        economyPrice = 10000 + Math.ceil(distanceKm - 10) * 2000;
      }
    } else {
      if (distanceKm <= 5) {
        economyPrice = 5000;
      } else if (distanceKm <= 10) {
        economyPrice = 8000;
      } else if (distanceKm <= 15) {
        economyPrice = 12000;
      } else if (distanceKm <= 20) {
        economyPrice = 15000;
      } else if (distanceKm <= 25) {
        economyPrice = 18000;
      } else if (distanceKm <= 30) {
        economyPrice = 21000;
      } else {
        // Fallback for > 30km: add 1000 for each additional km
        economyPrice = 21000 + Math.ceil(distanceKm - 30) * 1000;
      }
    }

    // Optionally apply night surcharge on top of the fixed model
    if (isNightRate) {
      economyPrice += Math.round(distanceKm * nightSurchargePerKm);
    }

    const businessPrice = Math.round(economyPrice * 1.5);

    const price = dto.vehicleType === 'BUSINESS' ? businessPrice : economyPrice;
    const platformFee = Math.round(price * 0.2);

    return {
      price,
      economyPrice,
      businessPrice,
      isNightRate,
      nightSurchargePerKm: isNightRate ? nightSurchargePerKm : undefined,
      distance: { meters: distanceMeters, text: distanceText, value: distanceKm },
      eta: { seconds: durationSeconds, text: durationText },
      breakdown: {
        baseFare: isAirportDrop ? 10000 : 5000,
        distanceFare: economyPrice - (isAirportDrop ? 10000 : 5000),
        timeFare: 0,
        platformFee,
      }
    };
  }

  async getDeliveryFare(dto: DeliveryFareDto) {
    const { pickuplat, pickuplong, dropofflat, dropofflong } = dto;

    const lat1 = Number(pickuplat);
    const lng1 = Number(pickuplong);
    const lat2 = Number(dropofflat);
    const lng2 = Number(dropofflong);

    const distanceKm = this.calculateDistance(lat1, lng1, lat2, lng2);
    const price = await this.calcDeliveryFee(distanceKm);

    const distanceMeters = Math.round(distanceKm * 1000);
    const durationSeconds = Math.round(distanceKm * 180);
    const durationText = `${Math.round(durationSeconds / 60)} min`;
    const distanceText = `${distanceKm.toFixed(2)} km`;

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
   */
  async calcDeliveryFee(distanceKm: number): Promise<number> {
    const [baseFare, perKm] = await Promise.all([
      this.getSetting('delivery_base_fare', this.DefaultBaseDeliveryFare),
      this.getSetting('delivery_per_km', this.DefaultDeliveryPerKm),
    ]);
    const fee = Math.round(baseFare + distanceKm * perKm);
    return Math.max(fee, baseFare);
  }

  /**
   * Unified distance calculation using the GeoService (H3/Great Circle).
   * Use this as the standard across the backend to ensure price consistency.
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    return this.geoService.calculateDistance(lat1, lng1, lat2, lng2);
  }

  // ── Convenience accessors (kept for backward-compat; prefer calcDeliveryFee) ─
  /** @deprecated Use getSetting('ride_base_fare', DefaultBaseRideFare) or async methods */
  get BaseRideFare() {
    return this.DefaultBaseRideFare;
  }
  /** @deprecated Use getSetting('ride_per_km', DefaultRiderPerKm) or async methods */
  get RiderPerKm() {
    return this.DefaultRiderPerKm;
  }
  /** @deprecated Use getSetting('delivery_base_fare', DefaultBaseDeliveryFare) or calcDeliveryFee */
  get BaseDeliveryFare() {
    return this.DefaultBaseDeliveryFare;
  }
  /** @deprecated Use getSetting('delivery_per_km', DefaultDeliveryPerKm) or calcDeliveryFee */
  get DeliveryPerKm() {
    return this.DefaultDeliveryPerKm;
  }
}
