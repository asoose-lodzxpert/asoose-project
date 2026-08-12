'use client';

import { useRideStore } from '../store/ride';
import { RideSelection } from './RideSelection';
import { FindingDriver } from './FindingDriver';
import { DriverArrived } from './DriverArrived';
import { TripInProgress } from './TripInProgress';
import { RatingModal } from './RatingModal';
import { LocationSelector } from './LocationSelector';
import { PostRidePayment } from './PostRidePayment';
import { useReverseGeocoding } from '../hooks/useReverseGeocoding';

export function RideController() {
  const rideStatus = useRideStore((state) => state.rideStatus);
  const isConfiguring = useRideStore((state) => state.isConfiguring);

  // ✅ ACTIVATE REVERSE GEOCODING
  // This ensures that whenever the map updates coordinates, we fetch the address text
  useReverseGeocoding();

  // If we are actively pinning a location on the map, show the Selector Overlay
  if (isConfiguring) {
    return <LocationSelector />;
  }

  // Standard Flow (post-ride payment model)
  switch (rideStatus) {
    case 'searching':
      return <FindingDriver />;
    case 'confirmed': // Driver on way
    case 'arrived':   // Driver waiting
      return <DriverArrived />;
    case 'in-progress':
      return <TripInProgress />;
    case 'payment-required': // Ride completed — collect payment
      return <PostRidePayment />;
    case 'finished':
      return <RatingModal />;
    case 'idle':
    default:
      return (
        <div className="flex flex-col h-full bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
          <div className="flex-1 overflow-y-auto">
            <RideSelection />
          </div>
        </div>
      );
  }
}
