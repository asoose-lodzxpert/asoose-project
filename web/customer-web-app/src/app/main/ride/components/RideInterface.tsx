'use client';

import { useRideStore } from '../store/ride';

import { RideSelection } from './RideSelection';
import { FindingDriver } from './FindingDriver';
import { DriverArrived } from './DriverArrived';
import { TripInProgress } from './TripInProgress';
import { RatingModal } from './RatingModal';

export function RideInterface() {
  const { rideStage } = useRideStore();

  switch (rideStage) {
    case 'findingDriver':
      return <FindingDriver />;
    case 'driverArrived':
      return <DriverArrived />;
    case 'inProgress':
      return <TripInProgress />;
    case 'complete':
      return <RatingModal />;
    case 'idle':
    default:
      return <RideSelection />;
  }
}
