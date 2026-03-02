import { RideStatus } from "@/types/ride";

export function statusInfo(status: string): {
  label: string;
  sub?: string;
  pillColor?: string;
} {
  switch (status) {
    case "REQUESTED":
    case "SEARCHING_DRIVER":
      return {
        label: "Finding your driver",
        sub: "Usually takes under a minute",
      };
    case "DRIVER_ACCEPTED":
      return {
        label: "Driver is on the way",
        sub: "Show your trip code when they arrive",
      };
    case "IN_PROGRESS":
      return { label: "On the way", sub: "Heading to destination" };
    case "ARRIVED":
      return {
        label: "Driver has arrived",
        sub: "Share your trip code to begin",
      };
    case "COMPLETED":
      return {
        label: "Ride complete",
        sub: "Please complete payment to finish",
      };
    case "PAID":
      return { label: "Payment confirmed", sub: "Thanks for riding!" };
    // Legacy
    case "ACCEPTED":
      return { label: "Driver is on the way", sub: "Show your trip code" };
    default:
      return { label: "Tracking ride" };
  }
}

export const isSearching = (status: string) =>
  status === "REQUESTED" || status === "SEARCHING_DRIVER";

/** Post-ride payment: customer must pay once the ride reaches COMPLETED. */
export const isAwaitingPayment = (status: string) => status === "COMPLETED";

/** Driver accepted and is en route to pickup — show OTP for ride start. */
export const isDriverAccepted = (status: string) =>
  status === "DRIVER_ACCEPTED";

/** Payment confirmed — ride fully settled. */
export const isPaid = (status: string) => status === "PAID";

export const isInProgress = (status: string) =>
  status === "IN_PROGRESS" || status === "ARRIVED";

/** Cancellable only before the ride physically starts. */
export const canCancel = (status: string) =>
  [
    "REQUESTED",
    "SEARCHING_DRIVER",
    "DRIVER_ACCEPTED",
    RideStatus.PENDING,
    RideStatus.ACCEPTED,
  ].includes(status);

export function getStatusPillColor(
  status: string,
  primary: string,
  success: string,
) {
  if (isSearching(status)) return primary;
  // COMPLETED = awaiting post-ride payment — amber warning
  if (isAwaitingPayment(status)) return "#F59E0B";
  if (isInProgress(status)) return success;
  return primary;
}
