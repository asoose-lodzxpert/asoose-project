export type JobType = "ride" | "delivery";

export type JobStatus =
  | "offline"
  | "online-waiting"
  | "incoming-job"
  | "en-route-pickup"
  | "at-pickup"
  | "en-route-dropoff"
  | "confirm-job";

/** A single pickup stop in a multi-store grouped delivery */
export interface DeliveryStop {
  orderId: string;
  storeName: string;
  pickupAddressId: string;
  pickupAddress: any;
  status: "PENDING" | "PICKED_UP";
}

export interface IncomingJobOffer {
  id: string;
  jobType: JobType;

  pickupAddress: any;
  dropoffAddress: any;

  customerName: string;

  /** Phone of the pickup contact: vendor for deliveries, passenger for rides */
  pickupContactPhone?: string;
  /** Phone of the dropoff contact: recipient for deliveries */
  dropoffContactPhone?: string;
  /** Name of the recipient at dropoff (delivery only) */
  recipientName?: string;

  earnings: number;
  packageDetails?: string; // delivery
  requiresOtp?: boolean; // delivery — true when an OTP must be collected from recipient
  distanceKm?: number; // ride
  durationMin?: number; // ride

  // Order items (what is being picked up)
  orderItems?: string[];

  // Package handling flags
  isFragile?: boolean;
  isPerishable?: boolean;
  containsLiquid?: boolean;
  weightKg?: number | null;

  // Multi-stop delivery fields
  stops?: DeliveryStop[];
  storeCount?: number;
  currentStopIndex?: number;
}

export interface CurrentJob {
  id: string;
  jobType: JobType;

  pickupAddress: any;
  dropoffAddress: any;

  customerName: string;
  customerPhone?: string;

  /** Phone of the pickup contact: vendor for deliveries, passenger for rides */
  pickupContactPhone?: string;
  /** Phone of the dropoff contact: recipient for deliveries */
  dropoffContactPhone?: string;
  /** Name of the recipient at dropoff (delivery only) */
  recipientName?: string;

  earnings: number;

  packageDetails?: string; // delivery
  requiresOtp?: boolean; // delivery — true when an OTP must be collected from recipient
  startOtp?: string; // ride

  status: string;

  assignedAt?: Date;
  pickedUpAt?: Date;

  // Multi-stop delivery fields
  stops?: DeliveryStop[];
  storeCount?: number;
  currentStopIndex?: number;
  orderGroupId?: string;
}
