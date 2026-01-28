export type JobType = 'ride' | 'delivery';

export interface JobSummaryDto {
  id: string;
  jobType: JobType;
  pickupAddress: any;
  dropoffAddress: any;
  customerName: string;
  customerPhone?: string;
  earnings: number;
  distanceKm?: number;
  durationMin?: number;
  packageDetails?: string;
  status: string;
}

// Status mapping from backend to frontend
export function mapBackendStatusToFrontend(
  status: string,
  jobType: JobType,
): string {
  const rideMap: Record<string, string> = {
    REQUESTED: 'incoming-job',
    ASSIGNED: 'en-route-pickup',
    ACCEPTED: 'en-route-pickup',
    STARTED: 'en-route-dropoff',
    COMPLETED: 'online-waiting',
    CANCELLED: 'cancelled',
  };
  const deliveryMap: Record<string, string> = {
    REQUESTED: 'incoming-job',
    ASSIGNED: 'en-route-pickup',
    ACCEPTED: 'en-route-pickup',
    PICKED_UP: 'en-route-dropoff',
    DELIVERED: 'online-waiting',
    CANCELLED: 'cancelled',
  };
  return jobType === 'ride'
    ? rideMap[status] || status
    : deliveryMap[status] || status;
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
    earnings: ride.totalFare || 0,
    distanceKm: ride.distanceKm,
    durationMin: ride.durationMin,
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
    earnings: delivery.deliveryFee || 0,
    distanceKm: delivery.distanceKm,
    packageDetails: delivery.packageDetails,
    status: mapBackendStatusToFrontend(delivery.status, 'delivery'),
  };
}
