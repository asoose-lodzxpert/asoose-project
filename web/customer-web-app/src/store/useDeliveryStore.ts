import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// 1. Update the Stage type to include REVIEW_PAYMENT
export type DeliveryStage = 
  | 'IDLE' 
  | 'CONFIGURING' 
  | 'Processing_Address' 
  | 'Calculating_Fee' 
  | 'REVIEW_PAYMENT'      // ✅ ADDED THIS
  | 'SELECTING_VEHICLE'   // Kept for backward compatibility if needed, or you can remove it
  | 'Payment_Pending' 
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
  pickupAddress: string;
  destinationAddress: string;
}

interface DeliveryState {
  stage: DeliveryStage;
  activeDeliveryId: string | null;
  pickupPos: Position | null;
  dropoffPos: Position | null;
  
  pickupAddressId: string | null;
  dropoffAddressId: string | null;

  courierPos: Position | undefined;
  packageInfo: PackageInfo;
  
  calculatedFee: number | null;
  
  courierInfo: any | null;
  isCalculating: boolean;

  // Actions
  setStage: (stage: DeliveryStage) => void;
  setLocations: (pickup?: Position, dropoff?: Position) => void;
  setAddressIds: (pickupId?: string, dropoffId?: string) => void; 
  setPackageInfo: (info: Partial<PackageInfo>) => void;
  setCalculatedFee: (fee: number) => void; 
  resetDelivery: () => void;
}

const initialPackageInfo: PackageInfo = {
  type: 'Document',
  weight: '< 5kg',
  instructions: '',
  recipientName: '',
  recipientPhone: '',
  pickupAddress: '',
  destinationAddress: '',
};

export const useDeliveryStore = create<DeliveryState>()(
  persist(
    (set) => ({
      stage: 'IDLE',
      activeDeliveryId: null,
      pickupPos: null,
      dropoffPos: null,
      pickupAddressId: null,
      dropoffAddressId: null,
      courierPos: undefined,
      packageInfo: initialPackageInfo,
      calculatedFee: null,
      courierInfo: null,
      isCalculating: false,

      setStage: (stage) => set({ stage }),
      
      setLocations: (pickup, dropoff) => set((state) => ({ 
        pickupPos: pickup ?? state.pickupPos, 
        dropoffPos: dropoff ?? state.dropoffPos 
      })),

      setAddressIds: (pickupId, dropoffId) => set((state) => ({
        pickupAddressId: pickupId ?? state.pickupAddressId,
        dropoffAddressId: dropoffId ?? state.dropoffAddressId
      })),

      setPackageInfo: (info) => set((state) => ({ 
        packageInfo: { ...state.packageInfo, ...info } 
      })),

      setCalculatedFee: (fee) => set({ calculatedFee: fee }),

      resetDelivery: () => set({
        stage: 'IDLE',
        activeDeliveryId: null,
        pickupPos: null,
        dropoffPos: null,
        pickupAddressId: null,
        dropoffAddressId: null,
        courierPos: undefined,
        calculatedFee: null,
        courierInfo: null,
        packageInfo: initialPackageInfo,
      }),
    }),
    {
      name: 'asoose-delivery-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ 
        stage: state.stage, 
        packageInfo: state.packageInfo,
        activeDeliveryId: state.activeDeliveryId,
        pickupPos: state.pickupPos,
        dropoffPos: state.dropoffPos,
        pickupAddressId: state.pickupAddressId,
        dropoffAddressId: state.dropoffAddressId,
        calculatedFee: state.calculatedFee
      }),
    }
  )
);