// Strict builder for ride request payload matching backend RequestRideDto

export interface LocationPayloadDto {
  addressText: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

export interface CreateRidePayload {
  pickupLocation: LocationPayloadDto;
  dropoffLocation: LocationPayloadDto;
  vehicleType: string;
  fare: number;
  distanceKm: number;
  durationMin: number;
  notes?: string;
}

export function buildCreateRidePayload({
  pickupLocation,
  dropoffLocation,
  vehicleType,
  fare,
  distanceKm,
  durationMin,
  notes,
}: Partial<CreateRidePayload>): CreateRidePayload {
  if (!pickupLocation || !pickupLocation.addressText) throw new Error('Pickup location required');
  if (!dropoffLocation || !dropoffLocation.addressText) throw new Error('Dropoff location required');
  if (!vehicleType) throw new Error('Vehicle type required');
  if (typeof fare !== 'number' || fare <= 0) throw new Error('Valid fare required');
  if (typeof distanceKm !== 'number' || distanceKm <= 0) throw new Error('Valid distance required');
  if (typeof durationMin !== 'number' || durationMin <= 0) throw new Error('Valid duration required');
  return {
    pickupLocation: {
      addressText: pickupLocation.addressText,
      placeId: pickupLocation.placeId,
      lat: pickupLocation.lat,
      lng: pickupLocation.lng,
    },
    dropoffLocation: {
      addressText: dropoffLocation.addressText,
      placeId: dropoffLocation.placeId,
      lat: dropoffLocation.lat,
      lng: dropoffLocation.lng,
    },
    vehicleType,
    fare,
    distanceKm,
    durationMin,
    ...(notes ? { notes } : {}),
  };
}
