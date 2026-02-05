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

  async geocodePlace(
    placeId: string,
  ): Promise<{ lat: number; lng: number; address: string }> {
    if (!placeId) {
      throw new Error('Place ID is required');
    }

    const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${this.apiKey}`;

    try {
      const res = await axios.get(url);
      if (res.data.results && res.data.results.length > 0) {
        const result = res.data.results[0];
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address,
        };
      }
      throw new Error('No results found for place ID');
    } catch (error) {
      this.appLogger.error('Error geocoding place', error?.stack, {
        error,
        placeId,
      });
      throw new Error('Failed to geocode place');
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

  /**
   * Generate a Google Static Maps URL with markers and optional path
   * Format: markers=color:label|lat,lng&markers=...&path=...
   */
  getStaticMapUrl(
    markers: string,
    path?: string,
    center?: string,
    zoom: string = '14',
    size: string = '600x400',
  ): { url: string } {
    const baseUrl = 'https://maps.googleapis.com/maps/api/staticmap';
    const params = new URLSearchParams();

    params.append('size', size);
    params.append('key', this.apiKey);

    if (center) {
      params.append('center', center);
    }

    if (zoom) {
      params.append('zoom', zoom);
    }

    // Parse and add markers
    // Format: pickup:6.5244,3.3792|dropoff:6.4698,3.5852|driver:6.5100,3.4000
    if (markers) {
      const markerList = markers.split('|');
      markerList.forEach((marker) => {
        const [label, coords] = marker.split(':');
        if (coords) {
          const color =
            label === 'pickup' ? 'green' : label === 'dropoff' ? 'red' : 'blue';
          params.append(
            'markers',
            `color:${color}|label:${label.charAt(0).toUpperCase()}|${coords}`,
          );
        }
      });
    }

    // Add path if provided (encoded polyline or lat,lng pairs)
    if (path) {
      params.append('path', `color:0x0000ff|weight:3|${path}`);
    }

    return { url: `${baseUrl}?${params.toString()}` };
  }
}
