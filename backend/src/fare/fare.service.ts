import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import { RideFareDto } from './dto/ride-fare-dto';
import { DeliveryFareDto } from './dto/delivery-fare-dto';

type DistanceResult = {
  distanceMeters: number;
  distanceText: string;
  durationSeconds: number;
  durationText: string;
};

@Injectable()
export class FareService {
  private readonly logger = new Logger(FareService.name);

  // Total fare = Base fare + (Distance × per km rate)
  // Ride fare constants
  readonly BaseRideFare = 1000;
  readonly RiderPerKm = 700;

  // Delivery fare constants
  readonly BaseDeliveryFare = 700;
  readonly DeliveryPerKm = 400;

  private googleApiKey(): string {
    const key = process.env.GOOGLE_MAPS_API_KEY;
    if (!key) {
      this.logger.error('Missing GOOGLE_MAPS_API_KEY in environment');
      throw new Error('Missing GOOGLE_MAPS_API_KEY');
    }
    return key;
  }

  private async getDistanceAndEta(
    pickuplat: string,
    pickuplong: string,
    dropofflat: string,
    dropofflong: string,
  ): Promise<DistanceResult> {
    const key = this.googleApiKey();
    const origins = `${pickuplat},${pickuplong}`;
    const destinations = `${dropofflat},${dropofflong}`;

    const url = `https://maps.googleapis.com/maps/api/distancematrix/json`;
    try {
      const res = await axios.get(url, {
        params: {
          origins,
          destinations,
          key,
          units: 'metric',
        },
        timeout: 5000,
      });

      const data = res.data;
      if (data.status !== 'OK') {
        this.logger.error('Google Distance Matrix error', data);
        throw new Error('Google Distance Matrix API error');
      }

      const element = data.rows?.[0]?.elements?.[0];
      if (!element || element.status !== 'OK') {
        this.logger.error('No element or element not OK', element);
        throw new Error(
          'Could not get distance/duration for provided coordinates',
        );
      }

      return {
        distanceMeters: element.distance.value,
        distanceText: element.distance.text,
        durationSeconds: element.duration.value,
        durationText: element.duration.text,
      };
    } catch (err) {
      this.logger.error('Failed to fetch distance matrix', err as any);
      throw err;
    }
  }

  /**
   * Returns an object with price (number), distance (meters + text) and eta (seconds + text)
   */
  async getRideFare(dto: RideFareDto) {
    const { pickuplat, pickuplong, dropofflat, dropofflong } = dto;

    const { distanceMeters, distanceText, durationSeconds, durationText } =
      await this.getDistanceAndEta(
        pickuplat,
        pickuplong,
        dropofflat,
        dropofflong,
      );

    const distanceKm = distanceMeters / 1000;
    const variableFare = Math.round(distanceKm * this.RiderPerKm);
    const price = this.BaseRideFare + variableFare;

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

  async getDeliveryFare(dto: DeliveryFareDto) {
    const { pickuplat, pickuplong, dropofflat, dropofflong } = dto;

    const { distanceMeters, distanceText, durationSeconds, durationText } =
      await this.getDistanceAndEta(
        pickuplat,
        pickuplong,
        dropofflat,
        dropofflong,
      );

    const distanceKm = distanceMeters / 1000;
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
