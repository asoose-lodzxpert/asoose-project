import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AppLogger } from '../libs/logger/app-logger.service';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as polyline from '@mapbox/polyline';

@Injectable()
export class MapsService {
  private readonly apiKey: string;

  constructor(
    private readonly appLogger: AppLogger,
    private readonly prisma: PrismaService,
  ) {
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

    const url = `https://maps.googleapis.com/maps/api/geocode/json?place_id=${encodeURIComponent(placeId)}&key=${this.apiKey}`;

    // Separate network errors from API-level errors so we can surface the real status
    let res: any;
    try {
      res = await axios.get(url);
    } catch (networkError: any) {
      this.appLogger.error(
        'Network error calling Google Geocoding API',
        networkError?.stack,
        { placeId },
      );
      throw new ServiceUnavailableException(
        'Geocoding service temporarily unavailable. Please try again.',
      );
    }

    const status: string = res.data?.status;

    if (status === 'OK' && res.data.results?.length > 0) {
      const result = res.data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address,
      };
    }

    // Log the actual Google status so it is visible in production logs
    this.appLogger.error('Google Geocoding API non-OK status', undefined, {
      placeId,
      status,
      error_message: res.data?.error_message ?? '(none)',
    });

    if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
      throw new NotFoundException(
        'No location found for this place. Please search again and select a result from the list.',
      );
    }

    if (status === 'REQUEST_DENIED') {
      throw new ServiceUnavailableException(
        'Geocoding service configuration error. Please contact support.',
      );
    }

    if (status === 'OVER_QUERY_LIMIT') {
      throw new ServiceUnavailableException(
        'Geocoding quota exceeded. Please try again shortly.',
      );
    }

    if (status === 'INVALID_REQUEST') {
      throw new BadRequestException(
        'Invalid Place ID. Please search again and select a valid location.',
      );
    }

    throw new ServiceUnavailableException(
      'Geocoding service error. Please try again or enter your address manually.',
    );
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

    let res: any;
    try {
      res = await axios.get(url);
    } catch (networkError) {
      this.appLogger.error(
        'Network error calling Google Geocoding API',
        networkError?.stack,
        { lat, lng },
      );
      throw new ServiceUnavailableException(
        'Geocoding service temporarily unavailable. Please try again.',
      );
    }

    const status: string = res.data?.status;

    // Success — return the best result
    if (status === 'OK' && res.data.results?.length > 0) {
      const result = res.data.results[0];
      return {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
        address: result.formatted_address,
        placeId: result.place_id,
      };
    }

    // No address found for this coordinate (e.g. middle of a field, API restriction)
    // Return a graceful fallback so the user's coordinates are still usable.
    if (status === 'ZERO_RESULTS' || status === 'NOT_FOUND') {
      this.appLogger.warn(
        'Google Geocoding returned no results — returning coordinate fallback',
        { lat, lng, status },
      );
      return {
        lat,
        lng,
        address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        placeId: '',
      };
    }

    // API-level errors (REQUEST_DENIED, INVALID_REQUEST, OVER_QUERY_LIMIT, etc.)
    this.appLogger.error('Google Geocoding API error', undefined, {
      lat,
      lng,
      status,
      error_message: res.data?.error_message,
    });
    throw new ServiceUnavailableException(
      status === 'OVER_QUERY_LIMIT'
        ? 'Geocoding quota exceeded. Please try again shortly.'
        : 'Geocoding service error. Please try again or enter your address manually.',
    );
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
   * Returns active service zone bounds derived from the ServiceZone DB table.
   * Computes bounding boxes from polygon vertices and a combined default center.
   * Called by the public GET /maps/service-bounds endpoint (consumed by mobile apps).
   */
  async getServiceBounds(): Promise<{
    bounds: Array<{
      name: string;
      minLat: number;
      maxLat: number;
      minLng: number;
      maxLng: number;
      center: { lat: number; lng: number };
    }>;
    defaultCenter: {
      latitude: number;
      longitude: number;
      latitudeDelta: number;
      longitudeDelta: number;
    };
  }> {
    const zones = await this.prisma.serviceZone.findMany({
      where: { isActive: true },
      select: { name: true, coordinates: true },
    });

    const bounds = zones.map((zone) => {
      const coords = zone.coordinates as Array<{ lat: number; lng: number }>;
      const lats = coords.map((c) => c.lat);
      const lngs = coords.map((c) => c.lng);
      const minLat = Math.min(...lats);
      const maxLat = Math.max(...lats);
      const minLng = Math.min(...lngs);
      const maxLng = Math.max(...lngs);
      return {
        name: zone.name,
        minLat,
        maxLat,
        minLng,
        maxLng,
        center: { lat: (minLat + maxLat) / 2, lng: (minLng + maxLng) / 2 },
      };
    });

    // Fall back to Maiduguri if no zones are configured in DB yet
    if (bounds.length === 0) {
      bounds.push({
        name: 'Maiduguri',
        minLat: 11.7,
        maxLat: 11.95,
        minLng: 13.0,
        maxLng: 13.3,
        center: { lat: 11.825, lng: 13.15 },
      });
    }

    const allLats = bounds.flatMap((b) => [b.minLat, b.maxLat]);
    const allLngs = bounds.flatMap((b) => [b.minLng, b.maxLng]);
    const globalMinLat = Math.min(...allLats);
    const globalMaxLat = Math.max(...allLats);
    const globalMinLng = Math.min(...allLngs);
    const globalMaxLng = Math.max(...allLngs);

    return {
      bounds,
      defaultCenter: {
        latitude: (globalMinLat + globalMaxLat) / 2,
        longitude: (globalMinLng + globalMaxLng) / 2,
        latitudeDelta: Math.max(globalMaxLat - globalMinLat, 0.18),
        longitudeDelta: Math.max(globalMaxLng - globalMinLng, 0.18),
      },
    };
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

  /**
   * Returns all active cities from the City table.
   * Used to populate dropdowns in the registration flow and app startup.
   */
  async getActiveLocations(): Promise<{ id: string; name: string; state: string }[]> {
    return this.prisma.city.findMany({
      where: { isActive: true },
      select: { id: true, name: true, state: true },
      orderBy: [{ state: 'asc' }, { name: 'asc' }],
    });
  }

  /**
   * Resolves GPS coordinates to the nearest active City using
   * existing ServiceZone polygon data (Ray-Casting algorithm).
   * This is the ONLY place GPS is used — for one-time city detection on app start.
   */
  async getCityByCoords(lat: number, lng: number): Promise<{ id: string; name: string; state: string } | null> {
    const zones = await this.prisma.serviceZone.findMany({
      where: { isActive: true },
    });

    for (const zone of zones) {
      const coords = zone.coordinates as { lat: number; lng: number }[];
      if (this.pointInPolygon(lat, lng, coords)) {
        // Zone name should match a City name (case-insensitive)
        const city = await this.prisma.city.findFirst({
          where: { name: { equals: zone.name, mode: 'insensitive' }, isActive: true },
          select: { id: true, name: true, state: true },
        });
        if (city) return city;
      }
    }
    return null;
  }

  /**
   * Helper to get distance in meters between two points.
   * Leverages the Directions API logic and returns only the distance value.
   */
  async getDistance(
    originLat: string,
    originLng: string,
    destLat: string,
    destLng: string,
  ): Promise<number> {
    const res = await this.getDirections(
      originLat,
      originLng,
      destLat,
      destLng,
    );

    if (res.error || !res.distance) {
      throw new BadRequestException(res.error || 'Could not calculate distance');
    }

    return res.distance.value;
  }

  /** Ray-Casting point-in-polygon test */
  private pointInPolygon(lat: number, lng: number, polygon: { lat: number; lng: number }[]): boolean {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const xi = polygon[i].lat, yi = polygon[i].lng;
      const xj = polygon[j].lat, yj = polygon[j].lng;
      const intersect = yi > lng !== yj > lng && lat < ((xj - xi) * (lng - yi)) / (yj - yi) + xi;
      if (intersect) inside = !inside;
    }
    return inside;
  }
}
