'use client';

import { useRideStore } from '../store/ride';

import { RideSelection } from './RideSelection';
import { FindingDriver } from './FindingDriver';
import { DriverArrived } from './DriverArrived';
import { TripInProgress } from './TripInProgress';
import { RatingModal } from './RatingModal';

export function RideInterface() {
  const rideStatus = useRideStore((state) => state.rideStatus);

  switch (rideStatus) {
    case 'searching':
      return <FindingDriver />;
    case 'arrived':
      return <DriverArrived />;
    case 'in-progress':
      return <TripInProgress />;
    case 'finished':
      return <RatingModal />;
    case 'idle':
    default:
      return <RideSelection />;
  }
}
