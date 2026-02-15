'use client';

import { useRideStore } from "../store/ride";
// 1. Remove the conflicting PlaceAutocomplete import
// import { PlaceAutocomplete } from './PlaceAutocomplete'; 

// 2. Import your safe component instead
import { LocationAutocompleteInput } from "./LocationAutocompleteInput";

export function RideSelection() {
  const pickupLocation = useRideStore((state) => state.pickupLocation);
  const dropoffLocation = useRideStore((state) => state.dropoffLocation);
  const setRideStatus = useRideStore((state) => state.setRideStatus);
  const setRideType = useRideStore((state) => state.setRideType);
  
  // 3. Add explicit setters if you need to transform the data
  const setPickupLocation = useRideStore((state) => state.setPickupLocation);
  const setDropoffLocation = useRideStore((state) => state.setDropoffLocation);

  const handleRideRequest = (rideType: 'economy' | 'business') => {
    setRideType(rideType);
    setRideStatus('confirmed');
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white p-4 shadow-lg rounded-t-lg z-20">
      <h2 className="text-xl font-bold mb-4">Where to?</h2>
      <div className="grid grid-cols-1 gap-4">
        {/* 4. Replace PlaceAutocomplete with LocationAutocompleteInput */}
        
        <LocationAutocompleteInput
          type="pickup"
          // The component passes (location, address), so we just take the location
          onLocationSelect={(loc, address) => setPickupLocation(loc)}
          initialValue={pickupLocation ? 'Current Pickup' : ''}
        />

        <LocationAutocompleteInput
          type="dropoff"
          onLocationSelect={(loc, address) => setDropoffLocation(loc)}
          initialValue={dropoffLocation ? 'Current Dropoff' : ''}
        />
      </div>
      
      {pickupLocation && dropoffLocation && (
        <div className="mt-4 grid grid-cols-2 gap-4">
          <button 
            onClick={() => handleRideRequest('economy')} 
            className="bg-black text-white p-4 rounded-lg font-bold"
          >
            Economy - $10
          </button>
          <button 
            onClick={() => handleRideRequest('business')} 
            className="bg-gray-800 text-white p-4 rounded-lg font-bold"
          >
            Business - $20
          </button>
        </div>
      )}
    </div>
  );
}