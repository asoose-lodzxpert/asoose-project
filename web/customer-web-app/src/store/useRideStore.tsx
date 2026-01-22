'use client';

import { create } from 'zustand';
import { RideService, VehicleType } from '@/services/ride.service';

export type RideStage = 
  | 'IDLE' 
  | 'REQUESTING' 
  | 'DRIVER_ASSIGNED' 
  | 'DRIVER_ARRIVING' 
  | 'IN_RIDE' 
  | 'COMPLETED' 
  | 'CANCELLED';

interface RideState {
  // Lifecycle & Tracking
  rideStage: RideStage;
  activeRideId: string | null;
  trackingId: number | null;
  
  // Spatial Data
  userLocation: google.maps.LatLngLiteral | null;
  destination: { address: string; lat: number; lng: number } | null;
  driverLocation: google.maps.LatLngLiteral | undefined;
  
  // Trip Data
  priceEstimates: any | null;
  driverInfo: any | null;
  isCalculating: boolean;

  // Actions
  setRideStage: (stage: RideStage) => void;
  setDestination: (dest: { address: string; lat: number; lng: number } | null) => void;
  setDriverLocation: (loc: google.maps.LatLngLiteral) => void;
  
  // GPS Tracking Logic
  startLiveTracking: () => void;
  stopLiveTracking: () => void;
  
  // Async Logic
  calculatePrice: () => Promise<void>;
  resetRide: () => void;
}

export const useRideStore = create<RideState>((set, get) => ({
  rideStage: 'IDLE',
  activeRideId: null,
  trackingId: null,
  userLocation: null,
  destination: null,
  driverLocation: undefined,
  priceEstimates: null,
  driverInfo: null,
  isCalculating: false,

  setRideStage: (stage) => set({ rideStage: stage }),

  setDestination: (dest) => {
    set({ destination: dest });
    if (dest) get().calculatePrice();
  },

  setDriverLocation: (loc) => set({ driverLocation: loc }),

  startLiveTracking: () => {
    if (get().trackingId !== null || typeof navigator === 'undefined' || !navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        set({ userLocation: { lat: pos.coords.latitude, lng: pos.coords.longitude } });
      },
      (err) => console.error("GPS Tracking Error:", err),
      { enableHighAccuracy: true, maximumAge: 0, timeout: 5000 }
    );
    set({ trackingId: id });
  },

  stopLiveTracking: () => {
    if (get().trackingId !== null) {
      navigator.geolocation.clearWatch(get().trackingId!);
      set({ trackingId: null });
    }
  },

  calculatePrice: async () => {
    const { userLocation, destination } = get();
    if (!userLocation || !destination) return;
    
    set({ isCalculating: true });
    try {
      // FIX: Use RideService.getEstimate and pass correct field names expected by the service
      const estimates = await RideService.getEstimate({
        pickupLat: userLocation.lat,
        pickupLng: userLocation.lng,
        dropoffLat: destination.lat,
        dropoffLng: destination.lng,
        vehicleType: 'CAR' as VehicleType // Defaults to CAR, can be made dynamic if needed
      });
      
      set({ priceEstimates: estimates });
    } catch (error) {
      console.error("Price Calculation Error:", error);
    } finally {
      set({ isCalculating: false });
    }
  },

  resetRide: () => set({
    rideStage: 'IDLE',
    activeRideId: null,
    destination: null,
    driverInfo: null,
    driverLocation: undefined,
    priceEstimates: null
  }),
}));