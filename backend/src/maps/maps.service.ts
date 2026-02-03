import { Injectable } from '@nestjs/common';
import { AppLogger } from '../libs/logger/app-logger.service';
import axios from 'axios';
import * as polyline from '@mapbox/polyline';

@Injectable()
export class MapsService {
  private readonly apiKey: string;

  constructor(private readonly appLogger: AppLogger) {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  }

  async searchAddress(
    query: string,
    latitude?: string,
    longitude?: string,
  ): Promise<Array<{ id: string; title: string; subtitle: string }>> {
    if (!query || query.length < 3) return [];

    const bias =
      latitude && longitude
        ? `&location=${latitude},${longitude}&radius=30000`
        : '';

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}${bias}&components=country:ng&key=${this.apiKey}`;

    try {
      const res = await axios.get(url);
      return (
        res.data.predictions?.map((p: any) => ({
          id: p.place_id,
          title: p.structured_formatting.main_text,
          subtitle: p.structured_formatting.secondary_text,
        })) ?? []
      );
    } catch (error) {
      this.appLogger.error('Error searching address', error?.stack, { error });
      return [];
    }
  }

  async placesAutocomplete(
    query: string,
    location?: string,
  ): Promise<Array<{ id: string; title: string; subtitle: string }>> {
    if (!query || query.length < 3) return [];

    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${this.apiKey}&location=${location ?? ''}&radius=30000`;

    try {
      const res = await axios.get(url);
      return (
        res.data.predictions?.map((p: any) => ({
          id: p.place_id,
          title: p.structured_formatting.main_text,
          subtitle: p.structured_formatting.secondary_text,
        })) ?? []
      );
    } catch (error) {
      this.appLogger.error('Error in places autocomplete', error?.stack, {
        error,
      });
      return [];
    }
  }

  async getDirections(
    originLat: string,
    originLng: string,
    destLat: string,
    destLng: string,
  ): Promise<{
    coordinates: Array<{ latitude: number; longitude: number }>;
    distance: { text: string; value: number };
    duration: { text: string; value: number };
    error?: string;
  }> {
    if (!originLat || !originLng || !destLat || !destLng) {
      return {
        error:
          'Missing required parameters: originLat, originLng, destLat, destLng',
        coordinates: [],
        distance: { text: '', value: 0 },
        duration: { text: '', value: 0 },
      };
    }

    const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${originLat},${originLng}&destination=${destLat},${destLng}&key=${this.apiKey}&mode=driving`;

    try {
      const res = await axios.get(url);

      if (!res.data.routes || res.data.routes.length === 0) {
        return {
          error: 'No route found',
          coordinates: [],
          distance: { text: '', value: 0 },
          duration: { text: '', value: 0 },
        };
      }

      const route = res.data.routes[0];
      const points: Array<{ latitude: number; longitude: number }> = polyline
        .decode(route.overview_polyline.points)
        .map(([lat, lng]: [number, number]) => ({
          latitude: lat,
          longitude: lng,
        }));

      return {
        coordinates: points,
        distance: route.legs[0].distance,
        duration: route.legs[0].duration,
      };
    } catch (error) {
      this.appLogger.error('Error fetching directions', error?.stack, {
        error,
      });
      return {
        error: 'Failed to fetch directions',
        coordinates: [],
        distance: { text: '', value: 0 },
        duration: { text: '', value: 0 },
      };
    }
  }
}
