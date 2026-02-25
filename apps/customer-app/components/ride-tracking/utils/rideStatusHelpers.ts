import { Ride } from "@/types/ride";
import { RideService } from "@/services/ride.service";
import {
  isSearching,
  isAwaitingPayment,
  isPaid,
  isInProgress,
  canCancel,
  getStatusPillColor,
} from "./rideStatusUtils";

export type DerivedRideState = {
  st: string;
  searching: boolean;
  awaitingPayment: boolean;
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
  const awaitingPayment = isAwaitingPayment(st);
  const paid = isPaid(st);
  const inProgress = isInProgress(st);
  const hasDriver =
    !!currentRide.rider && (awaitingPayment || paid || inProgress);
  const showOTP = paid && !!currentRide.startOtp;
  const showCancel = canCancel(st);
  const fareStr = RideService.formatCurrency(currentRide.totalFare ?? 0);
  const driverPhone: string | undefined =
    (currentRide.rider as any)?.phone ??
    (currentRide.rider as any)?.user?.phone;

  return {
    st,
    searching,
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
