import {
  Controller,
  Get,
  Query,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { MapsService } from './maps.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';

@ApiTags('Maps')
@Controller({
  path: 'maps',
  version: '1',
})
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  /**
   * Public endpoint — no auth required.
   * Returns active service zone bounding boxes so mobile apps can validate
   * locations on the frontend before sending them to the API.
   */
  @ApiOperation({
    summary: 'Get active service zone bounding boxes (public, no auth)',
  })
  @Get('service-bounds')
  async getServiceBounds() {
    return this.mapsService.getServiceBounds();
  }

  /**
   * 🔒 SECURED AUTOCOMPLETE ENDPOINTS
   * These endpoints are now protected with:
   * - JWT Authentication (requires logged-in user)
   * - Strict rate limiting (20 requests per minute per user)
   * - Input validation (minimum 3 characters)
   * - Geographic bias to Nigeria only
   */

  @ApiOperation({
    summary: 'Search addresses with autocomplete (rate-limited)',
  })
  @ApiBearerAuth()
  @Get('address-search')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } }) // 20 requests per minute
  async addressSearch(
    @Query('query') query: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    if (!query || query.trim().length < 3) {
      throw new BadRequestException('Query must be at least 3 characters long');
    }
    return this.mapsService.searchAddress(query.trim(), latitude, longitude);
  }

  @ApiOperation({ summary: 'Google Places autocomplete (rate-limited)' })
  @ApiBearerAuth()
  @Get('places-autocomplete')
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60 * 1000 } }) // 20 requests per minute
  async placesAutocomplete(
    @Query('query') query: string,
    @Query('location') location?: string,
  ) {
    if (!query || query.trim().length < 3) {
      throw new BadRequestException('Query must be at least 3 characters long');
    }
    return this.mapsService.placesAutocomplete(query.trim(), location);
  }

  @ApiOperation({ summary: 'Geocode a Google Place ID to lat/lng' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  @Get('geocode')
  async geocode(@Query('placeId') placeId: string) {
    if (!placeId) {
      throw new BadRequestException('placeId query parameter is required');
    }
    return this.mapsService.geocodePlace(placeId);
  }

  @ApiOperation({ summary: 'Reverse geocode lat/lng to address' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
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

  @ApiOperation({ summary: 'Get driving directions between two coordinates' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 15, ttl: 60_000 } })
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

  @ApiOperation({
    summary: 'Generate a static map image URL with markers/path',
  })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
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
