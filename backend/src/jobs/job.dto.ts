export type JobType = 'ride' | 'delivery';

export interface JobSummaryDto {
  id: string;
  jobType: JobType;
  pickupAddress: any;
  dropoffAddress: any;
  customerName: string;
  customerPhone?: string;
  /** Phone number of the pickup contact (vendor for deliveries, customer for rides) */
  pickupContactPhone?: string;
  /** Phone number of the dropoff contact (recipient for deliveries) */
  dropoffContactPhone?: string;
  earnings: number;
  distanceKm?: number;
  durationMin?: number;
  packageDetails?: string;
  /** OTPs for secure handover */
  deliveryOtp?: string;
  startOtp?: string;
  /**
   * Frontend JobStatus derived from DB status.
   * Values: incoming-job | en-route-pickup | at-pickup | en-route-dropoff | confirm-job | online-waiting
   */
  status: string;
}

// Status mapping from DB → frontend JobStatus
export function mapBackendStatusToFrontend(
  status: string,
  jobType: JobType,
): string {
  if (jobType === 'ride') {
    const map: Record<string, string> = {
      REQUESTED: 'incoming-job',
      ASSIGNED: 'incoming-job',
      ACCEPTED: 'en-route-pickup',
      ARRIVED: 'at-pickup',
      IN_PROGRESS: 'en-route-dropoff',
      COMPLETED: 'online-waiting',
      CANCELLED: 'online-waiting',
    };
    return map[status] ?? 'online-waiting';
  } else {
    const map: Record<string, string> = {
      PENDING: 'online-waiting',
      REQUESTED: 'online-waiting',
      ASSIGNED: 'incoming-job',
      ACCEPTED: 'en-route-pickup',
      PICKED_UP: 'en-route-dropoff',
      IN_TRANSIT: 'en-route-dropoff',
      DELIVERED: 'online-waiting',
      CANCELLED: 'online-waiting',
    };
    return map[status] ?? 'online-waiting';
  }
}

// Mapper: Ride → JobSummaryDto
export function rideToJobSummary(ride: any): JobSummaryDto {
  return {
    id: ride.id,
    jobType: 'ride',
    pickupAddress: ride.pickupAddress,
    dropoffAddress: ride.dropoffAddress,
    customerName: ride.customer?.name || 'Unknown',
    customerPhone: ride.customer?.phone,
    pickupContactPhone: ride.customer?.phone || undefined,
    dropoffContactPhone: undefined,
    earnings: ride.totalFare || 0,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
    startOtp: ride.startOtp,
    status: mapBackendStatusToFrontend(ride.status, 'ride'),
  };
}

// Mapper: Delivery → JobSummaryDto
export function deliveryToJobSummary(delivery: any): JobSummaryDto {
  return {
    id: delivery.id,
    jobType: 'delivery',
    pickupAddress: delivery.pickupAddress,
    dropoffAddress: delivery.dropoffAddress,
    customerName: delivery.customer?.name || 'Unknown',
    customerPhone: delivery.customer?.phone,
    pickupContactPhone:
      delivery.pickupAddress?.phone ||
      delivery.order?.store?.vendor?.phone ||
      undefined,
    dropoffContactPhone: delivery.recipientPhone || undefined,
    earnings: delivery.deliveryFee || 0,
    distanceKm: delivery.distanceKm,
    packageDetails: delivery.packageDetails,
    deliveryOtp: delivery.deliveryOtp,
    status: mapBackendStatusToFrontend(delivery.status, 'delivery'),
  };
}
