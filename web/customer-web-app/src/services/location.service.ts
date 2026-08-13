import { ApiService } from "./api.service";

export interface ActiveCity {
  id: string;
  name: string;
  state: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export class LocationService {
  static getActiveCities(token?: string) {
    return ApiService.get<ActiveCity[]>("/locations/active", token);
  }
}
