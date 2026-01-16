import { Controller, Get, Query } from '@nestjs/common';
import { MapsService } from './maps.service';

@Controller('maps')
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
}
