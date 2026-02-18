// TypeScript types for geolocation
export interface GeolocationCoordinates {
  lat: number;
  lng: number;
  accuracy: number;
}

export interface GeolocationError {
  code: 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT' | 'UNSUPPORTED' | 'UNKNOWN' | string;
  message: string;
  details?: string;
}