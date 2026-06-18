import { Injectable, Logger } from '@nestjs/common';
import { RideFareDto } from './dto/ride-fare-dto';
import { DeliveryFareDto } from './dto/delivery-fare-dto';
import { GeoService } from '../matching/geo/geo.service';
import { PrismaService } from '../prisma/prisma.service';
import { MapsService } from '../maps/maps.service';

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
    private readonly mapsService: MapsService,
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

  private isAirportLocation(lat: number, lng: number): boolean {
    for (const airport of this.AIRPORT_LOCATIONS) {
      const distance = this.geoService.calculateDistance(lat, lng, airport.lat, airport.lng);
      if (distance <= this.AIRPORT_RADIUS_KM) {
        return true;
      }
    }
    return false;
  }

  // Maimalari Barracks geofencing check
  private readonly BARRACKS_LOCATIONS = [
    { name: 'Maimalari Barracks', lat: 11.902845, lng: 13.108305 },
  ];
  private readonly BARRACKS_RADIUS_KM = 2.0; // 2km radius

  private isBarracksLocation(lat: number, lng: number): boolean {
    for (const barracks of this.BARRACKS_LOCATIONS) {
      const distance = this.geoService.calculateDistance(lat, lng, barracks.lat, barracks.lng);
      if (distance <= this.BARRACKS_RADIUS_KM) {
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

    // 1. Load all pricing configurations from DB (with defaults)
    const [
      fare5km,
      fare10km,
      fare15km,
      fare20km,
      fare25km,
      fare30km,
      extraKmFare,
      airportBase10km,
      airportExtraKm,
      nightSurchargePerKm,
      businessMultiplier,
      platformFeePercent,
    ] = await Promise.all([
      this.getSetting('ride_fare_5km', 5000),
      this.getSetting('ride_fare_10km', 8000),
      this.getSetting('ride_fare_15km', 12000),
      this.getSetting('ride_fare_20km', 15000),
      this.getSetting('ride_fare_25km', 18000),
      this.getSetting('ride_fare_30km', 21000),
      this.getSetting('ride_fare_extra_km', 1000),
      this.getSetting('ride_airport_base_10km', 10000),
      this.getSetting('ride_airport_extra_km', 2000),
      this.getSetting('ride_night_surcharge_per_km', 1000),
      this.getSetting('ride_business_multiplier', 1.5),
      this.getSetting('ride_platform_fee_percent', 20),
    ]);

    const lat1 = Number(pickuplat);
    const lng1 = Number(pickuplong);
    const lat2 = Number(dropofflat);
    const lng2 = Number(dropofflong);
    const distanceKm = await this.calculateRouteDistance(
      lat1,
      lng1,
      lat2,
      lng2,
    );
    const distanceMeters = Math.round(distanceKm * 1000);

    const durationSeconds = Math.round(distanceKm * 180); // ~3 min/km
    const durationText = `${Math.round(durationSeconds / 60)} min`;
    const distanceText = `${distanceKm.toFixed(2)} km`;

    // 2. Check for Night Rate (After 10 PM Africa/Lagos)
    const now = new Date();
    const lagosTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    );
    const hours = lagosTime.getHours();
    const isNightRate = hours >= 22 || hours < 5;

    const isAirportTrip = this.isAirportLocation(lat1, lng1) || this.isAirportLocation(lat2, lng2);
    const isPickupBarracks = this.isBarracksLocation(lat1, lng1);
    const isDropoffBarracks = this.isBarracksLocation(lat2, lng2);
    // Applies ONLY if trip starts/ends at barracks, NOT both (intra-barracks), and distance > 10km
    const isBarracksTrip = (isPickupBarracks || isDropoffBarracks) && !(isPickupBarracks && isDropoffBarracks) && distanceKm > 10;

    let economyPrice = 0;
    let baseBreakdown = 0;

    // 3. Apply Tiered Pricing Model
    if (isBarracksTrip) {
      economyPrice = isNightRate ? 30000 : 20000;
      baseBreakdown = economyPrice;
    } else if (isAirportTrip) {
      baseBreakdown = airportBase10km;
      if (distanceKm <= 10) {
        economyPrice = airportBase10km;
      } else {
        economyPrice = airportBase10km + Math.ceil(distanceKm - 10) * airportExtraKm;
      }
    } else {
      if (distanceKm <= 5) {
        economyPrice = fare5km;
        baseBreakdown = fare5km;
      } else if (distanceKm <= 10) {
        economyPrice = fare10km;
        baseBreakdown = fare10km;
      } else if (distanceKm <= 15) {
        economyPrice = fare15km;
        baseBreakdown = fare15km;
      } else if (distanceKm <= 20) {
        economyPrice = fare20km;
        baseBreakdown = fare20km;
      } else if (distanceKm <= 25) {
        economyPrice = fare25km;
        baseBreakdown = fare25km;
      } else if (distanceKm <= 30) {
        economyPrice = fare30km;
        baseBreakdown = fare30km;
      } else {
        economyPrice = fare30km + Math.ceil(distanceKm - 30) * extraKmFare;
        baseBreakdown = fare30km;
      }
    }

    // 4. Optionally apply night surcharge (skipped for Barracks flat fee)
    if (isNightRate && !isBarracksTrip) {
      economyPrice += Math.round(distanceKm * nightSurchargePerKm);
    }

    // 5. Apply Class Multiplier (skipped for Barracks flat fee)
    const businessPrice = isBarracksTrip ? economyPrice : Math.round(economyPrice * businessMultiplier);
    const price = dto.vehicleType === 'BUSINESS' ? businessPrice : economyPrice;
    
    // 6. Calculate Platform Fee
    const platformFee = Math.round(price * (platformFeePercent / 100));

    return {
      price,
      economyPrice,
      businessPrice,
      isNightRate,
      nightSurchargePerKm: isNightRate ? nightSurchargePerKm : undefined,
      distance: { meters: distanceMeters, text: distanceText, value: distanceKm },
      eta: { seconds: durationSeconds, text: durationText },
      breakdown: {
        baseFare: baseBreakdown,
        distanceFare: price - baseBreakdown,
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

    const distanceKm = await this.calculateRouteDistance(lat1, lng1, lat2, lng2);
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

  /**
   * Async driving route distance calculation using Google Maps.
   * Fallback to Haversine if Google API fails.
   */
  async calculateRouteDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): Promise<number> {
    try {
      const distanceMeters = await this.mapsService.getDistance(
        lat1.toString(),
        lng1.toString(),
        lat2.toString(),
        lng2.toString(),
      );
      return distanceMeters / 1000;
    } catch (err) {
      this.logger.warn('Google Maps getDistance failed, falling back to Haversine', err);
      return this.calculateDistance(lat1, lng1, lat2, lng2);
    }
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
