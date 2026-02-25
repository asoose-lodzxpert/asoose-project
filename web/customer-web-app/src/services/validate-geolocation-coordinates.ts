// Runtime validation for geolocation coordinates
export interface GeolocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function validateGeolocationCoordinates(coords: unknown): asserts coords is GeolocationCoordinates {
  if (!coords || typeof coords !== 'object') throw new Error('Coordinates must be an object');
  const c = coords as Record<string, unknown>;
  if (typeof c.lat !== 'number' || typeof c.lng !== 'number') throw new Error('lat/lng must be numbers');
}
