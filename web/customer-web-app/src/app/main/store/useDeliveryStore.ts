import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type DeliveryStage = 
  | 'IDLE' 
  | 'CONFIGURING' 
  | 'SELECTING_VEHICLE' 
  | 'FINDING_COURIER' 
  | 'COURIER_ASSIGNED' 
  | 'PICKED_UP' 
  | 'COMPLETED' 
  | 'CANCELLED';

type Position = { lat: number; lng: number };

interface PackageInfo {
  type: string;
  weight: string;
  instructions: string;
  recipientName: string;
  recipientPhone: string;
  destinationAddress: string;
}

interface DeliveryState {
  stage: DeliveryStage;
  activeDeliveryId: string | null;
  pickupPos: Position | null;
  dropoffPos: Position | null;
  courierPos: Position | undefined;
  packageInfo: PackageInfo;
  priceEstimates: any | null;
  courierInfo: any | null;
  isCalculating: boolean;

  // Actions
  setStage: (stage: DeliveryStage) => void;
  setLocations: (pickup?: Position, dropoff?: Position) => void;
  setPackageInfo: (info: Partial<PackageInfo>) => void;
  resetDelivery: () => void;
}

const initialPackageInfo: PackageInfo = {
  type: 'Document',
  weight: '< 5kg',
  instructions: '',
  recipientName: '',
  recipientPhone: '',
  destinationAddress: '',
};

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      stage: 'IDLE',
      activeDeliveryId: null,
      pickupPos: null,
      dropoffPos: null,
      courierPos: undefined,
      packageInfo: initialPackageInfo,
      priceEstimates: null,
      courierInfo: null,
      isCalculating: false,

      setStage: (stage) => set({ stage }),
      
      setLocations: (pickup, dropoff) => set((state) => ({ 
        pickupPos: pickup ?? state.pickupPos, 
        dropoffPos: dropoff ?? state.dropoffPos 
      })),

      setPackageInfo: (info) => set((state) => ({ 
        packageInfo: { ...state.packageInfo, ...info } 
      })),

      resetDelivery: () => set({
        stage: 'IDLE',
        activeDeliveryId: null,
        pickupPos: null,
        dropoffPos: null,
        courierPos: undefined,
        priceEstimates: null,
        courierInfo: null,
        packageInfo: initialPackageInfo,
      }),
    }),
    {
      name: 'asoose-delivery-storage', // Key used in localStorage
      storage: createJSONStorage(() => localStorage),
      // Optional: Only persist these specific fields
      partialize: (state) => ({ 
        stage: state.stage, 
        packageInfo: state.packageInfo,
        activeDeliveryId: state.activeDeliveryId,
        pickupPos: state.pickupPos,
        dropoffPos: state.dropoffPos
      }),
    }
  )
);