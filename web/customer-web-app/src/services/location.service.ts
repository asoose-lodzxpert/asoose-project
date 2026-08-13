import { ApiService } from "./api.service";

export interface ActiveCity {
  id: string;
  name: string;
  state: string;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
}

export interface ResolvedCity {
  city: {
    id: string;
    name: string;
    state: string;
    country: string | null;
  } | null;
  serviceAvailable: boolean;
}

export function prioritizeMaiduguri<T extends { name: string }>(cities: T[]): T[] {
  const maiduguriIndex = cities.findIndex(
    (city) => city.name.trim().toLowerCase() === "maiduguri",
  );

  if (maiduguriIndex <= 0) return cities;

  return [
    cities[maiduguriIndex],
    ...cities.slice(0, maiduguriIndex),
    ...cities.slice(maiduguriIndex + 1),
  ];
}

export class LocationService {
  static async getActiveCities(token?: string) {
    const cities = await ApiService.get<ActiveCity[]>("/locations/active", token);
    return prioritizeMaiduguri(cities);
  }

  static resolveCity(latitude: number, longitude: number) {
    return ApiService.post<ResolvedCity>("/locations/resolve-city", {
      latitude,
      longitude,
    });
  }
}
