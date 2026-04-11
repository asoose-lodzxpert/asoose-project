import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { LocationPayload } from '../services/scheduled-ride.service';

export type BookingStage = 'IDLE' | 'LOCATION' | 'SCHEDULE' | 'VEHICLE' | 'CONFIRM' | 'SUCCESS';

interface RideBookingState {
  stage: BookingStage;
  pickupLocation: LocationPayload | null;
  dropoffLocation: LocationPayload | null;
  scheduledAt: string | null;
  vehicleType: string | null;
  fare: number | null;
  
  setStage: (stage: BookingStage) => void;
  setLocation: (pickup: LocationPayload, dropoff: LocationPayload) => void;
  setSchedule: (scheduledAt: string) => void;
  setVehicle: (vehicleType: string, fare: number) => void;
  reset: () => void;
}

export const useRideStore = create<RideBookingState>()(
  persist(
    (set) => ({
      stage: 'IDLE',
      pickupLocation: null,
      dropoffLocation: null,
      scheduledAt: null,
      vehicleType: null,
      fare: null,
      setStage: (stage) => set({ stage }),
      setLocation: (pickup, dropoff) => set({ pickupLocation: pickup, dropoffLocation: dropoff }),
      setSchedule: (scheduledAt) => set({ scheduledAt }),
      setVehicle: (vehicleType, fare) => set({ vehicleType, fare }),
      reset: () => set({ 
        stage: 'IDLE', 
        pickupLocation: null, 
        dropoffLocation: null, 
        scheduledAt: null, 
        vehicleType: null, 
        fare: null 
      }),
    }),
    {
      name: 'ride-booking-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
