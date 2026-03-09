/**
 * RideViewModel - Canonical frontend representation of a ride
 * 
 * This is the ONLY type the UI should consume.
 * Transformations from backend Ride → RideViewModel occur in ride.mapper.ts
 * 
 * Rules:
 * - All fields are guaranteed safe (no undefined shocks)
 * - addressText is pre-constructed from backend address parts
 * - driver is flattened from backend rider
 * - statusLabel is human-readable format
 * - actualFare is mapped from backend totalFare
 */

export type RideStatus = 
  | 'REQUESTED' 
  | 'SEARCHING_DRIVER'
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ACCEPTED'
  | 'PAID'
  | 'ARRIVED' 
  | 'IN_PROGRESS' 
  | 'COMPLETED' 
  | 'CANCELLED'
  | 'CANCELLED_BY_USER'
  | 'CANCELLED_BY_DRIVER'
  | 'CANCELLED_BY_SYSTEM';

export interface AddressView {
  /** Constructed string: "${street}, ${city}, ${state}" */
  addressText: string;
  
  /** Raw latitude */
  lat: number | null;
  
  /** Raw longitude */
  lng: number | null;
  
  /** Original components (for advanced UI) */
  street?: string;
  city?: string;
  state?: string;
}

export interface DriverView {
  /** Driver ID from rider.id */
  id: string;
  
  /** Driver name */
  name: string;
  
  /** Driver profile image URL or null */
  image: string | null;
  
  /** Driver rating (e.g., 4.8) */
  rating: number | null;
  
  /** Vehicle plate number (mapped from vehicle.plateNumber) */
  vehicleNumber: string | null;
  
  /** Vehicle model (e.g., "Toyota Camry") */
  vehicleModel: string | null;
  
  /** Vehicle brand (e.g., "Toyota") */
  vehicleBrand: string | null;

  /** Driver phone number (masked) */
  phone: string | null;
}

export interface RideViewModel {
  /** Ride ID */
  id: string;
  
  /** Current ride status enum */
  status: RideStatus;
  
  /** Human-readable status (e.g., "In Progress") */
  statusLabel: string;
  
  /** Pickup location details */
  pickupAddress: AddressView;
  
  /** Dropoff location details */
  dropoffAddress: AddressView;
  
  /** Driver info (if ride was accepted) */
  driver?: DriverView;
  
  /** Actual fare charged (from backend totalFare) */
  actualFare: number;
  
  /** Distance traveled in km */
  distanceKm?: number;
  
  /** Duration in minutes */
  durationMin?: number;
  
  /** When ride was completed (backend completedAt) */
  completedTime?: Date;
  
  /** When ride was accepted by driver */
  acceptedTime?: Date;
  
  /** When ride started */
  startedTime?: Date;
  
  /** When ride was created */
  createdAt: Date;
  
  /** Ride payment status (PAID, PENDING, FAILED) */
  paymentStatus?: string;

  /** Payment method used (CASH, CARD, BANK_TRANSFER, etc.) */
  paymentMethod?: string;

  /** Payment reference from Paystack (C5 fix) */
  paymentReference?: string;
  
  /** Cancellation reason (if cancelled) */
  cancellationReason?: string;

  /** Vehicle type for this ride (ECONOMY | BUSINESS) */
  vehicleType?: string;
}

/**
 * Backend Ride type - what comes from API
 * DO NOT use this directly in UI. Transform via mapper.
 */
export interface BackendRide {
  id: string;
  status: RideStatus;
  customerId: string;
  riderId?: string;
  pickupAddressId: string;
  dropoffAddressId: string;
  createdAt?: string;
  updatedAt?: string;
  
  // Address objects
  pickupAddress?: {
    id?: string;
    street?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
    label?: string;
    phone?: string;
  };
  dropoffAddress?: {
    id?: string;
    street?: string;
    city?: string;
    state?: string;
    lat?: number;
    lng?: number;
    label?: string;
    phone?: string;
  };
  
  // Pricing
  totalFare?: number;
  /** @deprecated estimatedFare is not a real backend column — kept on BackendRide
   *  only because the API may still include it in responses for old rides. */
  estimatedFare?: number;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  platformFee?: number;
  driverFee?: number;
  surgeMultiplier?: number;
  
  // Trip data
  distanceKm?: number;
  durationMin?: number;

  /** Vehicle type requested (ECONOMY | BUSINESS) */
  vehicleType?: string;
  
  // Timestamps
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  
  // Driver/Rider info
  rider?: {
    id?: string;
    name?: string;
    phone?: string;
    image?: string;
    rating?: number;
    vehicle?: {
      id?: string;
      brand?: string;
      model?: string;
      plateNumber?: string;
      color?: string;
      year?: number;
    };
  };
  
  // Payment & Metadata
  payment?: {
    id?: string;
    amount?: number;
    status?: string;
    method?: string;
    reference?: string;
  };
  paymentStatus?: string;

  // Security
  startOtp?: string;
  cancellationReason?: string;
}
