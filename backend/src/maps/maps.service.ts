import { Injectable, BadRequestException } from '@nestjs/common';
import { AppLogger } from '../libs/logger/app-logger.service';
import axios from 'axios';
import * as polyline from '@mapbox/polyline';

@Injectable()
export class MapsService {
  private readonly apiKey: string;

  constructor(private readonly appLogger: AppLogger) {
    this.apiKey = process.env.GOOGLE_MAPS_API_KEY!;
  }

  // Used internally if needed
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

  // Used internally if needed
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

  /**
   * Translates a Place ID (provided by frontend) into trusted coordinates.
   */
  async geocodePlace(
    placeId: string,
  ): Promise<{ lat: number; lng: number; address: string }> {
    if (!placeId) {
      throw new BadRequestException('Place ID is required');
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
      throw new BadRequestException('Failed to geocode place');
    }
  }

  /**
   * ADDED FIX: Reverse Geocode for "Current Location" fallback.
   * Takes raw GPS data from the device and snaps it securely to a known map entity.
   */
  async reverseGeocode(
    lat: number,
    lng: number,
  ): Promise<{ lat: number; lng: number; address: string; placeId: string }> {
    const url = `https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${this.apiKey}`;

    try {
      const res = await axios.get(url);
      if (res.data.results && res.data.results.length > 0) {
        const result = res.data.results[0]; // Snaps to nearest known road/address
        return {
          lat: result.geometry.location.lat,
          lng: result.geometry.location.lng,
          address: result.formatted_address,
          placeId: result.place_id,
        };
      }
      throw new Error('No address found for these coordinates');
    } catch (error) {
      this.appLogger.error('Error reverse geocoding', error?.stack, {
        lat,
        lng,
      });
      throw new BadRequestException('Unroutable location coordinates.');
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
    steps?: Array<{
      instruction: string;
      distance: { text: string; value: number };
      duration: { text: string; value: number };
      endLocation: { latitude: number; longitude: number };
      maneuver?: string;
    }>;
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

      const steps = (route.legs[0].steps || []).map((step: any) => ({
        instruction: step.html_instructions
          .replace(/<b>/g, '')
          .replace(/<\/b>/g, '')
          .replace(/<div[^>]*>/g, ' ')
          .replace(/<\/div>/g, '')
          .replace(/<[^>]+>/g, '')
          .replace(/\s+/g, ' ')
          .trim(),
        distance: step.distance,
        duration: step.duration,
        endLocation: {
          latitude: step.end_location.lat,
          longitude: step.end_location.lng,
        },
        maneuver: step.maneuver || undefined,
      }));

      return {
        coordinates: points,
        distance: route.legs[0].distance,
        duration: route.legs[0].duration,
        steps,
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

    if (path) {
      params.append('path', `color:0x0000ff|weight:3|${path}`);
    }

    return { url: `${baseUrl}?${params.toString()}` };
  }
}
