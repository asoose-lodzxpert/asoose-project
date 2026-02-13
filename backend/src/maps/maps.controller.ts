import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { MapsService } from './maps.service';

@Controller({
  path: 'maps',
  version: '1',
})
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  /* * 🛑 SECURITY UPDATE:
   * `address-search` and `places-autocomplete` have been permanently removed.
   * Autocomplete is now handled securely by the frontend using Google Maps JS SDK + Session Tokens.
   * Exposing REST endpoints for Autocomplete on the backend creates a severe billing vulnerability.
   */

  @Get('geocode')
  async geocode(@Query('placeId') placeId: string) {
    if (!placeId) {
      throw new BadRequestException('placeId query parameter is required');
    }
    return this.mapsService.geocodePlace(placeId);
  }

  // ✅ ADDED: Expose reverse geocoding for internal/admin mapping utilities
  @Get('reverse-geocode')
  async reverseGeocode(@Query('lat') lat: string, @Query('lng') lng: string) {
    if (!lat || !lng) {
      throw new BadRequestException(
        'lat and lng query parameters are required',
      );
    }

    const parsedLat = parseFloat(lat);
    const parsedLng = parseFloat(lng);

    if (isNaN(parsedLat) || isNaN(parsedLng)) {
      throw new BadRequestException('Invalid coordinate formats');
    }

    return this.mapsService.reverseGeocode(parsedLat, parsedLng);
  }

  @Get('directions')
  async getDirections(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destLat') destLat: string,
    @Query('destLng') destLng: string,
  ) {
    if (!originLat || !originLng || !destLat || !destLng) {
      throw new BadRequestException('Missing required coordinate parameters');
    }

    return this.mapsService.getDirections(
      originLat,
      originLng,
      destLat,
      destLng,
    );
  }

  @Get('static-map')
  async getStaticMap(
    @Query('markers') markers: string,
    @Query('path') path?: string,
    @Query('center') center?: string,
    @Query('zoom') zoom?: string,
    @Query('size') size?: string,
  ) {
    if (!markers && !center) {
      throw new BadRequestException(
        'Either markers or center point is required',
      );
    }

    return this.mapsService.getStaticMapUrl(markers, path, center, zoom, size);
  }
}
