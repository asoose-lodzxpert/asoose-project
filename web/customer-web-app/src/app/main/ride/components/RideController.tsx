'use client';

import { Sidebar } from './Sidebar';
import { FindingDriver } from './FindingDriver';
import { TripInProgress } from './TripInProgress';
import { TripComplete } from './TripComplete';
import { RatingModal } from './RatingModal';
import { LocationSelector } from './LocationSelector';
import { DriverInfo } from './DriverInfo';
import { DriverArrived } from './DriverArrived'; // Added import
import { useRideStore } from '../store/ride';

export function RideController() {
  const rideStatus = useRideStore((state) => state.rideStatus);

  switch (rideStatus) {
    case 'idle':
      return <Sidebar />;
    
    case 'configuring':
      return <LocationSelector />;
    
    case 'searching':
      // STRICT: Only show searching spinner
      return <FindingDriver />;
    
    case 'confirmed':
      // STRICT: Only show driver info (Driver is en route)
      return <DriverInfo />;
    
    case 'arrived':
      // STRICT: Show arrival confirmation overlay
      return <DriverArrived />;
      
    case 'in-progress':
      return (
        <>
          <TripInProgress />
          <DriverInfo />
        </>
      );
      
    case 'finished':
      return (
        <>
          <TripComplete />
          <RatingModal />
        </>
      );
      
    default:
      return <Sidebar />;
  }
}