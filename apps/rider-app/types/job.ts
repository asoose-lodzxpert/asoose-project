export type JobType = "ride" | "delivery";

export type JobStatus =
  | "offline"
  | "online-waiting"
  | "incoming-job"
  | "en-route-pickup"
  | "at-pickup"
  | "en-route-dropoff"
  | "confirm-job";

export interface IncomingJobOffer {
  id: string;
  jobType: JobType;

  pickupAddress: any;
  dropoffAddress: any;

  customerName: string;

  earnings: number;

  packageDetails?: string; // delivery
  distanceKm?: number; // ride
  durationMin?: number; // ride
}

export interface CurrentJob {
  id: string;
  jobType: JobType;

  pickupAddress: any;
  dropoffAddress: any;

  customerName: string;
  customerPhone?: string;

  earnings: number;

  packageDetails?: string; // delivery
  deliveryOtp?: string; // delivery
  startOtp?: string; // ride

  status: string;

  assignedAt?: Date;
  pickedUpAt?: Date;
}
