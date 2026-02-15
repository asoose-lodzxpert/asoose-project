'use client';

import { useEffect, useState } from 'react';
import { useRideStore } from '../store/ride';
import { LocationAutocompleteInput } from './LocationAutocompleteInput';
import { Car, Clock, CreditCard } from 'lucide-react';
import Link from 'next/link';

export function Sidebar() {
  const {
    pickupLocation,
    dropoffLocation,
    setPickupLocation,
    setDropoffLocation,
    setRoutePolyline,
    rideType,
    setRideType,
    setRideStatus,
    setIsConfiguring,
  } = useRideStore();

  const [pickupAddress, setPickupAddress] = useState('');
  const [dropoffAddress, setDropoffAddress] = useState('');

  const handlePickupSelect = (location: google.maps.LatLngLiteral, address: string) => {
    setPickupLocation(location);
    setPickupAddress(address);
    setIsConfiguring('pickup');
  };

  const handleDropoffSelect = (location: google.maps.LatLngLiteral, address: string) => {
    setDropoffLocation(location);
    setDropoffAddress(address);
    setIsConfiguring('dropoff');
  };

  useEffect(() => {
    if (pickupLocation && dropoffLocation && typeof google !== 'undefined') {
      const directionsService = new google.maps.DirectionsService();
      directionsService.route(
        {
          origin: pickupLocation,
          destination: dropoffLocation,
          travelMode: google.maps.TravelMode.DRIVING,
        },
        (result, status) => {
          if (status === 'OK' && result) {
            setRoutePolyline(result.routes[0].overview_polyline);
          }
        }
      );
    }
  }, [pickupLocation, dropoffLocation, setRoutePolyline]);

  const handleRideSelection = (type: 'economy' | 'business') => {
    setRideType(type);
    if (pickupLocation && dropoffLocation) {
      // Changed from 'confirmed' to 'searching' to trigger simulation delay
      setRideStatus('searching');
    } else {
      setRideStatus('configuring');
    }
  };

  return (
    <div className="absolute top-0 left-0 h-full w-full md:w-[450px] bg-white dark:bg-zinc-900 shadow-2xl z-20 flex flex-col border-r border-zinc-200 dark:border-zinc-800">
      {/* Header */}
      <div className="p-6 bg-white dark:bg-zinc-900 z-20 shadow-sm border-b border-zinc-100 dark:border-zinc-800">
        <h1 className="text-2xl font-black tracking-tight mb-6 text-zinc-900 dark:text-white">Get a ride</h1>
        
        <div className="relative space-y-4">
          <div className="absolute left-[1.35rem] top-10 bottom-10 w-0.5 bg-zinc-200 dark:bg-zinc-700 -z-10" />

          {/* Pickup Input */}
          <div className="group relative">
             <div className="absolute left-3 top-3.5 z-10 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
               <div className="w-2.5 h-2.5 rounded-full bg-zinc-900 dark:bg-white ring-4 ring-white dark:ring-zinc-900" />
             </div>
            <div className="pl-8">
              <LocationAutocompleteInput 
                type="pickup" 
                onLocationSelect={handlePickupSelect} 
                initialValue={pickupAddress} 
              />
            </div>
          </div>

          {/* Dropoff Input */}
          <div className="group relative">
            <div className="absolute left-3 top-3.5 z-10 text-zinc-400 group-focus-within:text-zinc-900 dark:group-focus-within:text-white transition-colors">
              <div className="w-2.5 h-2.5 bg-zinc-900 dark:bg-white ring-4 ring-white dark:ring-zinc-900" />
            </div>
            <div className="pl-8">
              <LocationAutocompleteInput 
                type="dropoff" 
                onLocationSelect={handleDropoffSelect}
                initialValue={dropoffAddress}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Ride Options */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-zinc-50 dark:bg-[#0a0a0a]">
        {pickupLocation && dropoffLocation && (
          <h2 className="text-xs font-bold text-zinc-500 uppercase tracking-widest px-2 mb-2">Choose a ride</h2>
        )}
        
        <button
          className={`w-full p-4 rounded-xl text-left border-2 transition-all flex items-center space-x-4 group ${
            rideType === 'economy' 
              ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-400/10 shadow-sm' 
              : 'border-transparent bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
          }`}
          onClick={() => handleRideSelection('economy')}
        >
          <div className="w-16 h-12 relative flex-shrink-0 flex items-center justify-center bg-zinc-100 dark:bg-zinc-700 rounded-lg">
             <Car className="w-8 h-8 text-zinc-600 dark:text-zinc-300" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Economy</h3>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">$10.00</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Affordable, everyday rides</p>
          </div>
        </button>

        <button
          className={`w-full p-4 rounded-xl text-left border-2 transition-all flex items-center space-x-4 group ${
            rideType === 'business' 
              ? 'border-yellow-400 bg-yellow-50/50 dark:bg-yellow-400/10 shadow-sm' 
              : 'border-transparent bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700/50'
          }`}
          onClick={() => handleRideSelection('business')}
        >
          <div className="w-16 h-12 relative flex-shrink-0 flex items-center justify-center bg-zinc-900 dark:bg-black rounded-lg">
             <Car className="w-8 h-8 text-white" />
          </div>
          <div className="flex-1">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Business</h3>
              <span className="text-lg font-bold text-zinc-900 dark:text-white">$22.50</span>
            </div>
            <p className="text-sm text-zinc-500 dark:text-zinc-400">Premium comfort & style</p>
          </div>
        </button>
      </div>

      {/* Footer Actions */}
      <div className="p-4 bg-white dark:bg-zinc-900 border-t border-zinc-100 dark:border-zinc-800">
        {pickupLocation && dropoffLocation ? (
          <button 
            className="w-full bg-yellow-400 text-black py-4 rounded-xl font-bold text-lg hover:bg-yellow-300 transition-all shadow-lg active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => setRideStatus('searching')}
          >
            Confirm {rideType === 'business' ? 'Business' : 'Economy'}
          </button>
        ) : (
           <Link href="/history" className="flex items-center justify-center gap-2 w-full py-4 rounded-xl bg-zinc-100 dark:bg-zinc-800 font-bold text-zinc-700 dark:text-zinc-200 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors">
             <Clock size={20} />
             View Ride History
           </Link>
        )}
      </div>
    </div>
  );
}