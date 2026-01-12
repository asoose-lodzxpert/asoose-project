import { create } from 'zustand';

export type DeliveryStage = 
  | 'IDLE' 
  | 'CONFIGURING' // Adding package details
  | 'SELECTING_VEHICLE' 
  | 'FINDING_COURIER' 
  | 'COURIER_ASSIGNED' 
  | 'PICKED_UP' 
  | 'COMPLETED' 
  | 'CANCELLED';

interface DeliveryState {
  stage: DeliveryStage;
  activeDeliveryId: string | null;
  
  // Locations
  pickupPos: google.maps.LatLngLiteral | null;
  dropoffPos: google.maps.LatLngLiteral | null;
  courierPos: google.maps.LatLngLiteral | undefined;

  // Package Info
  packageInfo: {
    type: string;
    weight: string;
    instructions: string;
  };

  // UI State
  priceEstimates: any | null;
  courierInfo: any | null;
  isCalculating: boolean;

  // Actions
  setStage: (stage: DeliveryStage) => void;
  setLocations: (pickup?: google.maps.LatLngLiteral, dropoff?: google.maps.LatLngLiteral) => void;
  setPackageInfo: (info: Partial<DeliveryState['packageInfo']>) => void;
  resetDelivery: () => void;
}

export const useDeliveryStore = create<DeliveryState>((set) => ({
  stage: 'IDLE',
  activeDeliveryId: null,
  pickupPos: null,
  dropoffPos: null,
  courierPos: undefined,
  packageInfo: { type: 'Document', weight: '< 5kg', instructions: '' },
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
    dropoffPos: null,
    courierPos: undefined,
    priceEstimates: null,
    courierInfo: null
  }),
}));