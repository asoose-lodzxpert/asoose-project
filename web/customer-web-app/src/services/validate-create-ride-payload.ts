// Runtime validation for CreateRidePayload
import { CreateRidePayload } from './build-create-ride-payload';

export function validateCreateRidePayload(payload: unknown): asserts payload is CreateRidePayload {
  if (!payload || typeof payload !== 'object') throw new Error('Payload must be an object');
  if (!payload.pickupLocation || typeof payload.pickupLocation !== 'object') throw new Error('pickupLocation required');
  if (!payload.pickupLocation.addressText || typeof payload.pickupLocation.addressText !== 'string') throw new Error('pickupLocation.addressText required');
  if (typeof payload.pickupLocation.lat !== 'number' || typeof payload.pickupLocation.lng !== 'number') throw new Error('pickupLocation.lat/lng required');
  if (!payload.dropoffLocation || typeof payload.dropoffLocation !== 'object') throw new Error('dropoffLocation required');
  if (!payload.dropoffLocation.addressText || typeof payload.dropoffLocation.addressText !== 'string') throw new Error('dropoffLocation.addressText required');
  if (typeof payload.dropoffLocation.lat !== 'number' || typeof payload.dropoffLocation.lng !== 'number') throw new Error('dropoffLocation.lat/lng required');
  if (!payload.vehicleType || typeof payload.vehicleType !== 'string') throw new Error('vehicleType required');
}
