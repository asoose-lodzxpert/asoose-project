import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PricingService {
  private readonly logger = new Logger(PricingService.name);
  private readonly BASE_FEE: number;
  private readonly RATE_PER_KM: number;
  private readonly MIN_FEE: number;
  private readonly SERVICE_FEE_PERCENTAGE: number; // Added property

  constructor(private configService: ConfigService) {
    this.BASE_FEE = this.validateConfig('DELIVERY_BASE_FEE', 500);
    this.RATE_PER_KM = this.validateConfig('DELIVERY_RATE_PER_KM', 200);
    this.MIN_FEE = this.validateConfig('DELIVERY_MIN_FEE', 1000);
    this.SERVICE_FEE_PERCENTAGE = this.validateConfig('SERVICE_FEE_PERCENTAGE', 0.05); // Default 5%
  }

  /**
   * Calculates delivery fee based on distance
   */
  public calculateDeliveryFee(distanceKm: number): number {
    const fee = this.BASE_FEE + distanceKm * this.RATE_PER_KM;
    return Math.round(Math.max(fee, this.MIN_FEE));
  }

  /**
   * Calculates service fee (e.g. 5% of subtotal)
   * This is the NEW method required by OrdersService
   */
  public calculateServiceFee(subtotal: number): number {
    return Math.round(subtotal * this.SERVICE_FEE_PERCENTAGE);
  }

  /**
   * Calculates distance between two coordinates using Haversine formula
   */
  public calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number,
  ): number {
    if (lat1 === lat2 && lon1 === lon2) return 0;

    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) *
        Math.cos(this.deg2rad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private validateConfig(key: string, defaultValue: number): number {
    const value = this.configService.get<number>(key, defaultValue);
    if (typeof value !== 'number' || value < 0) {
      this.logger.warn(
        `Invalid config for ${key}, using default: ${defaultValue}`,
      );
      return defaultValue;
    }
    return value;
  }
}