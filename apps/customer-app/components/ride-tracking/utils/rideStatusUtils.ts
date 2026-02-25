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
        label: "Driver found!",
        sub: "Confirm payment to let them start",
      };
    case "PAID":
    case "ACCEPTED":
      return {
        label: "Driver is on the way",
        sub: "Show your trip code when they arrive",
      };
    case "ARRIVED":
      return {
        label: "Driver has arrived",
        sub: "Share your trip code to begin",
      };
    case "IN_PROGRESS":
      return { label: "On the way", sub: "Heading to destination" };
    case "COMPLETED":
      return { label: "Ride completed", sub: "Thanks for riding!" };
    default:
      return { label: "Tracking ride" };
  }
}

export const isSearching = (status: string) =>
  status === "REQUESTED" || status === "SEARCHING_DRIVER";

export const isAwaitingPayment = (status: string) =>
  status === "DRIVER_ACCEPTED";

export const isPaid = (status: string) => status === "PAID";

export const isInProgress = (status: string) =>
  status === "IN_PROGRESS" || status === "ARRIVED";

export const canCancel = (status: string) =>
  [
    "REQUESTED",
    "SEARCHING_DRIVER",
    "DRIVER_ACCEPTED",
    "PAID",
    RideStatus.PENDING,
    RideStatus.ACCEPTED,
  ].includes(status);

export function getStatusPillColor(
  status: string,
  primary: string,
  success: string,
) {
  if (isSearching(status)) return primary;
  if (isAwaitingPayment(status)) return "#F59E0B";
  if (isInProgress(status)) return success;
  return primary;
}
