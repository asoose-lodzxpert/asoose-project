'use client';

import { create } from 'zustand';
import { RideService } from '@/services/ride.service';

export type RideStage = 'IDLE' | 'FINDING_DRIVER' | 'ON_WAY' | 'ARRIVED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED';

interface RideState {
  rideStage: RideStage;
  activeRideId: string | null;
  userLocation: google.maps.LatLngLiteral | null;
  destination: { address: string; lat: number; lng: number } | null;
  priceEstimates: Record<string, any> | null; // Changed to keyed object
  driverInfo: any | null;
  driverLocation: google.maps.LatLngLiteral | undefined;
  isCalculating: boolean;

  // Actions
  setRideStage: (stage: RideStage) => void;
  setLocations: (pickup: google.maps.LatLngLiteral, dropoff: any) => void;
  setDriverInfo: (info: any) => void;
  updateDriverLocation: (loc: google.maps.LatLngLiteral) => void;
  setPriceEstimates: (est: any) => void;
  resetRide: () => void;
}

export const useRideStore = create<RideState>((set) => ({
  rideStage: 'IDLE',
  activeRideId: null,
  userLocation: null,
  destination: null,
  priceEstimates: null,
  driverInfo: null,
  driverLocation: undefined,
  isCalculating: false,

  setRideStage: (stage) => set({ rideStage: stage }),
  
  setLocations: (pickup, dropoff) => set({ userLocation: pickup, destination: dropoff }),
  
  setDriverInfo: (info) => set({ driverInfo: info }),
  
  updateDriverLocation: (loc) => set({ driverLocation: loc }),
  
  setPriceEstimates: (est) => set({ priceEstimates: est }),

  resetRide: () => set({
    rideStage: 'IDLE',
    activeRideId: null,
    destination: null,
    driverInfo: null,
    driverLocation: undefined,
    priceEstimates: null
  }),
}));