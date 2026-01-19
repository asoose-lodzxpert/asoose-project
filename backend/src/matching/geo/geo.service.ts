import { Injectable } from '@nestjs/common';
import {
  latLngToCell,
  cellToBoundary,
  gridDisk,
  getResolution,
  greatCircleDistance,
} from 'h3-js';

/**
 * H3 Geospatial Indexing Service
 *
 * Uses Uber's H3 hexagonal hierarchical geospatial indexing system.
 * Provides efficient spatial queries for driver-trip matching.
 *
 * Resolution levels (for reference):
 * - 7: ~5.16 km² per hex (good for city-wide)
 * - 8: ~0.74 km² per hex (good for neighborhoods) ⭐ RECOMMENDED
 * - 9: ~0.10 km² per hex (good for precise matching)
 */
@Injectable()
export class GeoService {
  // H3 resolution level (8 = ~0.74 km² hex, ~0.46 km avg edge)
  private readonly H3_RESOLUTION = 8;

  // Maximum search radius in km
  private readonly MAX_SEARCH_RADIUS_KM = 10;

  // Maximum number of hex rings to search
  private readonly MAX_RINGS = 5;

  /**
   * Convert latitude/longitude to H3 hex ID
   */
  latLngToHex(lat: number, lng: number, resolution?: number): string {
    return latLngToCell(lat, lng, resolution || this.H3_RESOLUTION);
  }

  /**
   * Get hex boundary coordinates (for visualization/debugging)
   */
  getHexBoundary(hexId: string): Array<[number, number]> {
    return cellToBoundary(hexId);
  }

  /**
   * Get all hexes within k rings from center hex
   *
   * Ring 0: Just the center hex (1 hex)
   * Ring 1: Center + adjacent (7 hexes total)
   * Ring 2: Ring 1 + next layer (19 hexes total)
   * Ring 3: 37 hexes total
   * Ring 4: 61 hexes total
   * Ring 5: 91 hexes total
   *
   * @param centerHex - Center H3 hex ID
   * @param k - Number of rings (0 to MAX_RINGS)
   * @returns Array of hex IDs in expanding rings
   */
  getHexRings(centerHex: string, k: number): string[][] {
    if (k < 0) k = 0;
    if (k > this.MAX_RINGS) k = this.MAX_RINGS;

    const rings: string[][] = [];

    for (let ring = 0; ring <= k; ring++) {
      if (ring === 0) {
        rings.push([centerHex]);
      } else {
        const allWithinRing = gridDisk(centerHex, ring);
        const previousRings = ring > 0 ? gridDisk(centerHex, ring - 1) : [];
        const currentRingOnly = allWithinRing.filter(
          (hex) => !previousRings.includes(hex),
        );
        rings.push(currentRingOnly);
      }
    }

    return rings;
  }

  /**
   * Get all hexes within k rings as flat array
   */
  getHexNeighbors(centerHex: string, k: number): string[] {
    if (k < 0) k = 0;
    if (k > this.MAX_RINGS) k = this.MAX_RINGS;
    return gridDisk(centerHex, k);
  }

  /**
   * Calculate distance between two coordinates (Haversine formula via H3)
   *
   * @returns Distance in kilometers
   */
  calculateDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    // H3's greatCircleDistance returns distance in km
    return greatCircleDistance([lat1, lng1], [lat2, lng2], 'km');
  }

  /**
   * Calculate estimated trip fare based on distance and time
   */
  calculateFare(
    distanceKm: number,
    durationMin: number,
  ): {
    baseFare: number;
    distanceFare: number;
    timeFare: number;
    platformFee: number;
    driverFee: number;
    totalFare: number;
  } {
    // Pricing constants (configurable via environment)
    const BASE_FARE = 500; // ₦500 base fare
    const PER_KM_RATE = 150; // ₦150 per km
    const PER_MIN_RATE = 20; // ₦20 per minute
    const PLATFORM_FEE_PERCENT = 0.15; // 15% platform fee

    const baseFare = BASE_FARE;
    const distanceFare = distanceKm * PER_KM_RATE;
    const timeFare = durationMin * PER_MIN_RATE;
    const subtotal = baseFare + distanceFare + timeFare;
    const platformFee = subtotal * PLATFORM_FEE_PERCENT;
    const totalFare = subtotal + platformFee;
    const driverFee = totalFare - platformFee;

    return {
      baseFare: Math.round(baseFare),
      distanceFare: Math.round(distanceFare),
      timeFare: Math.round(timeFare),
      platformFee: Math.round(platformFee),
      driverFee: Math.round(driverFee),
      totalFare: Math.round(totalFare),
    };
  }

  /**
   * Calculate delivery fee based on distance and package weight
   */
  calculateDeliveryFee(distanceKm: number, weightKg: number = 1): number {
    const BASE_FEE = 300; // ₦300 base delivery fee
    const PER_KM_RATE = 100; // ₦100 per km
    const PER_KG_RATE = 50; // ₦50 per kg

    const fee = BASE_FEE + distanceKm * PER_KM_RATE + weightKg * PER_KG_RATE;
    return Math.round(fee);
  }

  /**
   * Estimate trip duration based on distance (simplified)
   *
   * Assumes average speed of 30 km/h in city traffic
   */
  estimateDuration(distanceKm: number): number {
    const AVG_SPEED_KMH = 30;
    const durationHours = distanceKm / AVG_SPEED_KMH;
    const durationMin = Math.ceil(durationHours * 60);
    return durationMin;
  }

  /**
   * Check if coordinates are within service area
   *
   * In production, this would check against service zones in the database.
   * For MVP, we accept all coordinates.
   */
  isWithinServiceArea(lat: number, lng: number): boolean {
    // Basic validation
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) {
      return false;
    }

    // TODO: Check against ServiceZone polygons from database
    // For now, accept all valid coordinates
    return true;
  }

  /**
   * Get hex resolution info
   */
  getResolutionInfo(): {
    resolution: number;
    avgHexAreaKm2: number;
    avgEdgeLengthKm: number;
  } {
    // Approximate values for H3 resolution 8
    const resolutionData = {
      7: { area: 5.161, edge: 1.22 },
      8: { area: 0.737, edge: 0.461 },
      9: { area: 0.105, edge: 0.174 },
    };

    const data = resolutionData[this.H3_RESOLUTION] || resolutionData[8];

    return {
      resolution: this.H3_RESOLUTION,
      avgHexAreaKm2: data.area,
      avgEdgeLengthKm: data.edge,
    };
  }

  /**
   * Get maximum search configuration
   */
  getSearchConfig() {
    return {
      maxRings: this.MAX_RINGS,
      maxRadiusKm: this.MAX_SEARCH_RADIUS_KM,
      resolution: this.H3_RESOLUTION,
    };
  }

  /**
   * Sort driver candidates by distance
   */
  sortByDistance(
    pickupLat: number,
    pickupLng: number,
    drivers: Array<{ id: string; lat: number; lng: number }>,
  ): Array<{ id: string; lat: number; lng: number; distanceKm: number }> {
    const driversWithDistance = drivers.map((driver) => ({
      ...driver,
      distanceKm: this.calculateDistance(
        pickupLat,
        pickupLng,
        driver.lat,
        driver.lng,
      ),
    }));

    return driversWithDistance.sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Filter drivers within maximum radius
   */
  filterByRadius(
    pickupLat: number,
    pickupLng: number,
    drivers: Array<{ id: string; lat: number; lng: number }>,
    radiusKm: number,
  ): Array<{ id: string; lat: number; lng: number; distanceKm: number }> {
    return drivers
      .map((driver) => ({
        ...driver,
        distanceKm: this.calculateDistance(
          pickupLat,
          pickupLng,
          driver.lat,
          driver.lng,
        ),
      }))
      .filter((driver) => driver.distanceKm <= radiusKm)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  /**
   * Generate OTP for trip security
   */
  generateOTP(length: number = 4): string {
    const digits = '0123456789';
    let otp = '';
    for (let i = 0; i < length; i++) {
      otp += digits[Math.floor(Math.random() * digits.length)];
    }
    return otp;
  }

  /**
   * Validate coordinates
   */
  validateCoordinates(lat: number, lng: number): boolean {
    return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
  }
}
