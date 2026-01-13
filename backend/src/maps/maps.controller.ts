import { Controller, Get, Query } from '@nestjs/common';
import axios from 'axios';

const API_KEY = process.env.GOOGLE_MAPS_API_KEY!;

@Controller('maps')
export class MapsController {
  @Get('address-search')
  async addressSearch(
    @Query('query') query: string,
    @Query('latitude') latitude?: string,
    @Query('longitude') longitude?: string,
  ) {
    if (!query || query.length < 3) return [];
    const bias =
      latitude && longitude
        ? `&location=${latitude},${longitude}&radius=30000`
        : '';
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}${bias}&components=country:ng&key=${API_KEY}`;
    const res = await axios.get(url);
    return (
      res.data.predictions?.map((p: any) => ({
        id: p.place_id,
        title: p.structured_formatting.main_text,
        subtitle: p.structured_formatting.secondary_text,
      })) ?? []
    );
  }

  @Get('places-autocomplete')
  async placesAutocomplete(
    @Query('query') query: string,
    @Query('location') location?: string,
  ) {
    if (!query || query.length < 3) return [];
    const url = `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${encodeURIComponent(query)}&key=${API_KEY}&location=${location ?? ''}&radius=30000`;
    const res = await axios.get(url);
    return (
      res.data.predictions?.map((p: any) => ({
        id: p.place_id,
        title: p.structured_formatting.main_text,
        subtitle: p.structured_formatting.secondary_text,
      })) ?? []
    );
  }
}
