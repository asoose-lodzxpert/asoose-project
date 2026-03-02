import { Ride } from "@/types/ride";
import { RideService } from "@/services/ride.service";
import {
  isSearching,
  isDriverAccepted,
  isAwaitingPayment,
  isPaid,
  isInProgress,
  canCancel,
  getStatusPillColor,
} from "./rideStatusUtils";

export type DerivedRideState = {
  st: string;
  searching: boolean;
  /** DRIVER_ACCEPTED: driver en route to pickup, show OTP */
  driverAccepted: boolean;
  /** COMPLETED: post-ride payment required */
  awaitingPayment: boolean;
  /** PAID: payment confirmed — navigate to success */
  paid: boolean;
  inProgress: boolean;
  hasDriver: boolean;
  showOTP: boolean;
  showCancel: boolean;
  fareStr: string;
  driverPhone: string | undefined;
};

/**
 * Derives all boolean flags and formatted values from the current ride
 * so the screen only needs one call instead of repeating the same logic.
 */
export function getDerivedRideState(
  currentRide: Ride,
  primary: string,
  success: string,
): DerivedRideState {
  const st = currentRide.status as string;

  const searching = isSearching(st);
  const driverAccepted = isDriverAccepted(st);
  const awaitingPayment = isAwaitingPayment(st); // = COMPLETED, post-ride
  const paid = isPaid(st); // = PAID, payment confirmed
  const inProgress = isInProgress(st);

  // Show driver card only while driver is en route or trip is active.
  // After COMPLETED, the ride is over — driver info not needed.
  const hasDriver = !!currentRide.rider && (driverAccepted || inProgress);

  // OTP unlocks the ride start and is shown once the driver is accepted.
  const showOTP = driverAccepted && !!currentRide.startOtp;

  const showCancel = canCancel(st);
  const fareStr = RideService.formatCurrency(currentRide.totalFare ?? 0);
  const driverPhone: string | undefined =
    (currentRide.rider as any)?.phone ??
    (currentRide.rider as any)?.user?.phone;

  return {
    st,
    searching,
    driverAccepted,
    awaitingPayment,
    paid,
    inProgress,
    hasDriver,
    showOTP,
    showCancel,
    fareStr,
    driverPhone,
  };
}

export { getStatusPillColor };
