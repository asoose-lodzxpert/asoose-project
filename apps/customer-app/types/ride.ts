export enum RideStatus {
  // ── Active flow ──
  REQUESTED = "REQUESTED", // Customer submitted ride request
  SEARCHING_DRIVER = "SEARCHING_DRIVER", // System searching for a driver
  DRIVER_ACCEPTED = "DRIVER_ACCEPTED", // Driver accepted; customer must pay
  PAID = "PAID", // Payment confirmed; driver may start
  IN_PROGRESS = "IN_PROGRESS", // Trip in progress
  COMPLETED = "COMPLETED", // Trip completed
  CANCELLED_BY_USER = "CANCELLED_BY_USER", // Customer cancelled
  CANCELLED_BY_DRIVER = "CANCELLED_BY_DRIVER", // Driver cancelled
  CANCELLED_BY_SYSTEM = "CANCELLED_BY_SYSTEM", // System cancelled (no driver available)
  // ── Legacy (retained for backward compatibility) ──
  PENDING = "PENDING",
  ACCEPTED = "ACCEPTED",
  ARRIVED = "ARRIVED",
  CANCELLED = "CANCELLED",
}

export enum VehicleType {
  ECONOMY = "ECONOMY",
  BUSINESS = "BUSINESS",
}

export type Location = {
  latitude: number;
  longitude: number;
  address: string;
};

export type Driver = {
  id: string;
  name: string;
  phone: string;
  rating: number;
  vehicle: {
    make: string;
    model: string;
    color: string;
    plateNumber: string;
    year?: number;
  };
  totalRides?: number;
  currentLat?: number;
  currentLng?: number;
};

export type FareBreakdown = {
  baseFare: number;
  distanceFare: number;
  timeFare: number;
  platformFee: number;
  driverFee: number;
  totalFare: number;
  surgeMultiplier?: number;
};

export type FareEstimate = {
  distanceKm: number;
  durationMin: number;
  fareBreakdown: FareBreakdown;
};

export type Ride = {
  id: string;
  customerId: string;
  riderId: string | null;
  pickupAddressId: string;
  dropoffAddressId: string;
  status: RideStatus;
  createdAt: string;
  updatedAt: string;
  startOtp?: string;
  cancellationReason?: string;
  cancelledBy?: string;
  cancelledAt?: string;
  baseFare?: number;
  distanceFare?: number;
  timeFare?: number;
  surgeMultiplier?: number;
  platformFee?: number;
  driverFee?: number;
  totalFare?: number;
  distanceKm?: number;
  durationMin?: number;
  acceptedAt?: string;
  startedAt?: string;
  completedAt?: string;
  pickupAddress?: {
    id: string;
    street: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  };
  dropoffAddress?: {
    id: string;
    street: string;
    city: string;
    state: string;
    lat: number;
    lng: number;
  };
  rider?: Driver;
  payment?: {
    id: string;
    method: string;
    status: string;
    amount: number;
  };
};

export type CreateRidePayload = {
  pickupLocation: Location;
  dropoffLocation: Location;
  vehicleType: VehicleType;
  notes?: string;
  fare: number;
  distanceKm: number;
  durationMin: number;
};

export type RideEstimatePayload = {
  pickupLat: number;
  pickupLng: number;
  dropoffLat: number;
  dropoffLng: number;
  vehicleType?: string;
};

export type ConfirmRidePayload = {
  rideId: string;
  paymentMethod: "CASH" | "CARD";
};

export type CancelRidePayload = {
  /** Cancellation reason is required by the backend */
  reason: string;
};

export type DriverLocation = {
  latitude: number;
  longitude: number;
  heading: number;
};

// UI State types
export type RidePageView =
  | "IDLE"
  | "BOOKING"
  | "FINDING_DRIVER" // REQUESTED / SEARCHING_DRIVER
  | "AWAITING_PAYMENT" // DRIVER_ACCEPTED — customer must pay
  | "DRIVER_ASSIGNED" // PAID — driver is on the way
  | "IN_PROGRESS" // IN_PROGRESS
  | "COMPLETED"; // COMPLETED

export type RideContextState = {
  currentRide: Ride | null;
  pageView: RidePageView;
  loading: boolean;
  error: string | null;
  fareEstimate: FareEstimate | null;
  driverLocation: DriverLocation | null;
};

// WebSocket event types
export type RideSocketEvent =
  | {
      type: "ride_update";
      status: string;
      rideId: string;
      label?: string;
    }
  | {
      /** Driver accepted the ride — customer must now pay */
      type: "DRIVER_ACCEPTED";
      rideId: string;
      driver: Driver;
      message?: string;
    }
  | {
      /** Customer payment confirmed — driver may start trip */
      type: "PAYMENT_CONFIRMED";
      rideId: string;
      message?: string;
    }
  | {
      /** Legacy event — kept for backward compatibility */
      type: "DRIVER_FOUND";
      metadata: {
        rideId: string;
        driver: Driver;
      };
    }
  | {
      type: "DRIVER_ARRIVED";
      metadata: {
        rideId: string;
        message: string;
      };
    }
  | {
      type: "DRIVER_LOCATION_UPDATE";
      metadata: {
        rideId: string;
        lat: number;
        lng: number;
        heading: number;
      };
    }
  | {
      type: "TRIP_STARTED";
      rideId: string;
    }
  | {
      type: "TRIP_COMPLETED";
      rideId: string;
    }
  | {
      type: "RIDE_CANCELLED";
      rideId: string;
      /** Who cancelled: 'CUSTOMER' | 'DRIVER' | 'SYSTEM' */
      cancelledBy?: "CUSTOMER" | "DRIVER" | "SYSTEM" | string;
      reason?: string;
    }
  | {
      type: "NO_DRIVERS_FOUND";
      rideId: string;
      message: string;
    };
