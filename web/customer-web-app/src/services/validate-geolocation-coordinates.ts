// Runtime validation for geolocation coordinates
export interface GeolocationCoordinates {
  lat: number;
  lng: number;
  accuracy?: number;
}

export function validateGeolocationCoordinates(coords: unknown): asserts coords is GeolocationCoordinates {
  if (!coords || typeof coords !== 'object') throw new Error('Coordinates must be an object');
  if (typeof coords.lat !== 'number' || typeof coords.lng !== 'number') throw new Error('lat/lng must be numbers');
}
