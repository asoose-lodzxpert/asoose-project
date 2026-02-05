import { Controller, Get, Query } from '@nestjs/common';
import { MapsService } from './maps.service';

@Controller({
  path: 'maps',
  version: '1',
})
export class MapsController {
  constructor(private readonly mapsService: MapsService) {}

  @Get('address-search')
  async addressSearch(
    @Query('query') query: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    return this.mapsService.searchAddress(query, latitude, longitude);
  }

  @Get('places-autocomplete')
  async placesAutocomplete(
    @Query('query') query: string,
    @Query('location') location?: string,
  ) {
    return this.mapsService.placesAutocomplete(query, location);
  }

  @Get('geocode')
  async geocode(@Query('placeId') placeId: string) {
    return this.mapsService.geocodePlace(placeId);
  }

  @Get('directions')
  async getDirections(
    @Query('originLat') originLat: string,
    @Query('originLng') originLng: string,
    @Query('destLat') destLat: string,
    @Query('destLng') destLng: string,
  ) {
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
    return this.mapsService.getStaticMapUrl(markers, path, center, zoom, size);
  }
}
