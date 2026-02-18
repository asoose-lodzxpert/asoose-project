// Strict builder for ride request payload matching backend DTO
import { VehicleType } from '@/types/ride-view-model';

export interface LocationPayloadDto {
  addressText: string;
  placeId?: string;
  lat?: number;
  lng?: number;
}

export interface CreateRidePayload {
  pickupLocation: LocationPayloadDto;
  dropoffLocation: LocationPayloadDto;
  vehicleType: VehicleType;
  notes?: string;
}

export function buildCreateRidePayload({
  pickupLocation,
  dropoffLocation,
  vehicleType,
  notes,
}: Partial<CreateRidePayload>): CreateRidePayload {
  if (!pickupLocation || !pickupLocation.addressText) throw new Error('Pickup location required');
  if (!dropoffLocation || !dropoffLocation.addressText) throw new Error('Dropoff location required');
  if (!vehicleType) throw new Error('Vehicle type required');
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
    ...(notes ? { notes } : {}),
  };
}
