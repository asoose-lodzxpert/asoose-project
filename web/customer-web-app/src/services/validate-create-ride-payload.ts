// Runtime validation for CreateRidePayload
import { CreateRidePayload } from './build-create-ride-payload';

export function validateCreateRidePayload(payload: unknown): asserts payload is CreateRidePayload {
  if (!payload || typeof payload !== 'object') throw new Error('Payload must be an object');
  const p = payload as Record<string, any>;
  if (!p.pickupLocation || typeof p.pickupLocation !== 'object') throw new Error('pickupLocation required');
  if (!p.pickupLocation.addressText || typeof p.pickupLocation.addressText !== 'string') throw new Error('pickupLocation.addressText required');
  if (typeof p.pickupLocation.lat !== 'number' || typeof p.pickupLocation.lng !== 'number') throw new Error('pickupLocation.lat/lng required');
  if (!p.dropoffLocation || typeof p.dropoffLocation !== 'object') throw new Error('dropoffLocation required');
  if (!p.dropoffLocation.addressText || typeof p.dropoffLocation.addressText !== 'string') throw new Error('dropoffLocation.addressText required');
  if (typeof p.dropoffLocation.lat !== 'number' || typeof p.dropoffLocation.lng !== 'number') throw new Error('dropoffLocation.lat/lng required');
  if (!p.vehicleType || typeof p.vehicleType !== 'string') throw new Error('vehicleType required');
  if (typeof p.fare !== 'number' || p.fare <= 0) throw new Error('fare must be a positive number');
  if (typeof p.distanceKm !== 'number' || p.distanceKm <= 0) throw new Error('distanceKm must be a positive number');
  if (typeof p.durationMin !== 'number' || p.durationMin <= 0) throw new Error('durationMin must be a positive number');
}
