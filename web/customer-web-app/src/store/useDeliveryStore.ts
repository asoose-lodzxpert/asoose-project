import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Stage type: UI-only transient stages + backend-aligned tracking stages
// Backend DeliveryStatus: PENDING | REQUESTED | ASSIGNED | ACCEPTED | PICKED_UP | IN_TRANSIT | DELIVERED | CANCELLED
export type DeliveryStage =
  | 'IDLE'
  | 'CONFIGURING'
  | 'Processing_Address'
  | 'Calculating_Fee'
  | 'REVIEW_PAYMENT'
  | 'Payment_Pending'
  | 'REQUESTED'    // Backend: REQUESTED (finding courier)
  | 'ASSIGNED'     // Backend: ASSIGNED (courier matched)
  | 'ACCEPTED'     // Backend: ACCEPTED (rider confirmed) — same UI step as ASSIGNED
  | 'PICKED_UP'    // Backend: PICKED_UP
  | 'IN_TRANSIT'   // Backend: IN_TRANSIT (en route to dropoff) — same UI step as PICKED_UP
  | 'DELIVERED'    // Backend: DELIVERED (final state)
  | 'CANCELLED';

type Position = { lat: number; lng: number };

interface PackageInfo {
  type: string;
  size: 'SMALL' | 'MEDIUM' | 'LARGE';
  weight: string; // Legacy label (e.g., "< 5kg")
  instructions: string;
  recipientName: string;
  recipientPhone: string;
  senderName: string;
  senderPhone: string;
  pickupAddress: string;
  destinationAddress: string;

  // Numeric metadata fields
  weightKg?: number | null;      // Numeric input for exact weight
  declaredValue?: number | null;  // Numeric input for value
  isFragile?: boolean;
  isPerishable?: boolean;
  containsLiquid?: boolean;
}

interface DeliveryState {
  stage: DeliveryStage;
  activeDeliveryId: string | null;
  pickupPos: Position | null;
  dropoffPos: Position | null;
  
  // Added address IDs for backend linkage
  pickupAddressId: string | null;
  dropoffAddressId: string | null;

  courierPos: Position | undefined;
  packageInfo: PackageInfo;
  
  // Changed from generic 'priceEstimates' to specific fee
  calculatedFee: number | null;
  
  courierInfo: any | null;
  isCalculating: boolean;

  // Actions
  setStage: (stage: DeliveryStage) => void;
  setLocations: (pickup?: Position, dropoff?: Position) => void;
  setAddressIds: (pickupId?: string | null, dropoffId?: string | null) => void;
  setPackageInfo: (info: Partial<PackageInfo>) => void;
  setCalculatedFee: (fee: number | null) => void;
  resetDelivery: () => void;
}

const initialPackageInfo: PackageInfo = {
  type: 'Small delivery',
  size: 'SMALL',
  weight: 'Small items',
  instructions: '',
  recipientName: '',
  recipientPhone: '',
  senderName: '',
  senderPhone: '',
  pickupAddress: '',
  destinationAddress: '',
  
  // Initialize new fields
  weightKg: null,
  declaredValue: null,
  isFragile: false,
  isPerishable: false,
  containsLiquid: false,
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
        pickupAddressId: pickupId === undefined ? state.pickupAddressId : pickupId,
        dropoffAddressId: dropoffId === undefined ? state.dropoffAddressId : dropoffId,
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
      // Merge nested delivery fields so users with an older persisted form
      // automatically receive new defaults such as the explicit size enum.
      merge: (persisted, current) => {
        const saved = persisted as Partial<DeliveryState> | undefined;
        return {
          ...current,
          ...saved,
          packageInfo: {
            ...initialPackageInfo,
            ...(saved?.packageInfo ?? {}),
          },
        };
      },
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
