import { Injectable, Logger } from '@nestjs/common';
import { RideFareDto } from './dto/ride-fare-dto';
import { DeliveryFareDto } from './dto/delivery-fare-dto';
import { GeoService } from '../matching/geo/geo.service';

type DistanceResult = {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
};

@Injectable()
export class FareService {
  private readonly logger = new Logger(FareService.name);
  constructor(private readonly geoService: GeoService) {}

  // Total fare = Base fare + (Distance × per km rate)
  // Ride fare constants
  readonly BaseRideFare = 1000;
  readonly RiderPerKm = 700;

  // Delivery fare constants
  readonly BaseDeliveryFare = 700;
  readonly DeliveryPerKm = 400;

  /**
   * Returns an object with price (number), distance (meters + text) and eta (seconds + text)
   */
  async getRideFare(dto: RideFareDto) {
    const { pickuplat, pickuplong, dropofflat, dropofflong } = dto;

    // Use backend geo service for distance calculation
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

    // No ETA calculation (could be added if needed)
    const durationSeconds = Math.round(distanceKm * 180); // rough estimate: 3 min/km
    const durationText = `${Math.round(durationSeconds / 60)} min`;
    const distanceText = `${distanceKm.toFixed(2)} km`;

    // Get current time in Africa/Lagos
    const now = new Date();
    const lagosTime = new Date(
      now.toLocaleString('en-US', { timeZone: 'Africa/Lagos' }),
    );
    const hour = lagosTime.getHours();

    // After 10pm (22:00), use 1000 NGN per km
    const perKm = hour >= 22 ? 1000 : this.RiderPerKm;
    const variableFare = Math.round(distanceKm * perKm);
    const economyPrice = this.BaseRideFare + variableFare;
    const businessPrice = Math.round(economyPrice * 1.5);

    const price = dto.vehicleType === 'BUSINESS' ? businessPrice : economyPrice;

    return {
      price,
      economyPrice,
      businessPrice,
      distance: {
        meters: distanceMeters,
        text: distanceText,
      },
      eta: {
        seconds: durationSeconds,
        text: durationText,
      },
    };
  }

  async getDeliveryFare(dto: DeliveryFareDto) {
    const { pickuplat, pickuplong, dropofflat, dropofflong } = dto;

    // Use backend geo service for distance calculation
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

    const variableFare = Math.round(distanceKm * this.DeliveryPerKm);
    const price = this.BaseDeliveryFare + variableFare;

    return {
      price,
      distance: {
        meters: distanceMeters,
        text: distanceText,
      },
      eta: {
        seconds: durationSeconds,
        text: durationText,
      },
    };
  }
}
