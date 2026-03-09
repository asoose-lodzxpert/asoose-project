/**
 * Ride Status Formatter
 * Converts RideStatus enums to user-friendly labels and colors
 */

import type { RideStatus } from "@/types/ride-view-model";

export interface StatusDisplay {
  label: string;
  badge: string; // Tailwind color classes
  icon: "clock" | "check" | "x" | "car" | "person";
}

/**
 * Status display map — keyed by string (not RideStatus) so legacy DB values
 * like PENDING / ACCEPTED are still handled gracefully without polluting
 * the canonical RideStatus union. (H1 fix)
 */
const STATUS_MAP: Record<string, StatusDisplay> = {
  // Legacy statuses kept for old DB records — never emitted for new rides (H1)
  PENDING: {
    label: "Processing",
    badge:
      "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
    icon: "clock",
  },
  ACCEPTED: {
    label: "Driver Arriving",
    badge: "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200",
    icon: "car",
  },
  REQUESTED: {
    label: "Finding Driver",
    badge: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    icon: "clock",
  },
  SEARCHING_DRIVER: {
    label: "Searching for Driver",
    badge: "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    icon: "clock",
  },
  DRIVER_ASSIGNED: {
    label: "Driver Assigned",
    badge: "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200",
    icon: "car",
  },
  DRIVER_ACCEPTED: {
    label: "Driver Accepted",
    badge: "bg-cyan-100 dark:bg-cyan-900 text-cyan-800 dark:text-cyan-200",
    icon: "car",
  },
  PAID: {
    label: "Payment Confirmed",
    badge: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    icon: "check",
  },
  ARRIVED: {
    label: "Driver Arrived",
    badge:
      "bg-indigo-100 dark:bg-indigo-900 text-indigo-800 dark:text-indigo-200",
    icon: "person",
  },
  IN_PROGRESS: {
    label: "In Progress",
    badge:
      "bg-purple-100 dark:bg-purple-900 text-purple-800 dark:text-purple-200",
    icon: "car",
  },
  COMPLETED: {
    label: "Completed",
    badge: "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    icon: "check",
  },
  CANCELLED: {
    label: "Cancelled",
    badge: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    icon: "x",
  },
  CANCELLED_BY_USER: {
    label: "Cancelled by You",
    badge: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    icon: "x",
  },
  CANCELLED_BY_DRIVER: {
    label: "Cancelled by Driver",
    badge: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    icon: "x",
  },
  CANCELLED_BY_SYSTEM: {
    label: "Auto-cancelled",
    badge: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
    icon: "x",
  },
};

/**
 * Convert RideStatus enum to human-readable label
 */
export function formatRideStatus(status: RideStatus | string): string {
  return STATUS_MAP[status]?.label ?? status;
}

/**
 * Get status display info (label, colors, icon)
 */
export function getStatusDisplay(status: RideStatus | string): StatusDisplay {
  return (
    STATUS_MAP[status] ?? {
      label: status,
      badge: "bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200",
      icon: "clock",
    }
  );
}

/**
 * Format ride time (used for pickup/dropoff times)
 */
export function formatRideTime(dateString?: string): string {
  if (!dateString) return "--:--";
  try {
    const date = new Date(dateString);
    return date.toLocaleTimeString("en-NG", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });
  } catch {
    return "--:--";
  }
}

/**
 * Format full ride datetime (used in headers)
 */
export function formatRideDateTime(dateString?: string): string {
  if (!dateString) return "";
  try {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-NG", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

/**
 * Format currency (NGN)
 */
export function formatCurrency(amount?: number): string {
  if (amount === null || amount === undefined) {
    return "₦0.00";
  }
  return new Intl.NumberFormat("en-NG", {
    style: "currency",
    currency: "NGN",
  }).format(amount);
}

/**
 * Map backend RideStatus (screaming snake case) to frontend RideStage (kebab/camel)
 *
 * Post-ride payment model: payment is collected after the ride is completed.
 * DRIVER_ACCEPTED always maps to 'confirmed' (no pre-ride payment gate).
 * COMPLETED maps to 'payment-required' (if unpaid) or 'finished' (if paid).
 *
 * @param backendStatus - Backend status enum (SEARCHING_DRIVER, DRIVER_ACCEPTED, etc.)
 * @param serverPaymentCompleted - Whether payment.status === 'COMPLETED' on backend
 * @returns Frontend RideStage for the Zustand store
 */
export function mapBackendStatusToRideStage(
  backendStatus: RideStatus | string,
  serverPaymentCompleted: boolean = false,
):
  | "idle"
  | "configuring"
  | "searching"
  | "confirmed"
  | "arrived"
  | "in-progress"
  | "payment-required"
  | "finished" {
  const statusMap: Record<
    string,
    | "idle"
    | "configuring"
    | "searching"
    | "confirmed"
    | "arrived"
    | "in-progress"
    | "payment-required"
    | "finished"
  > = {
    // Legacy statuses (H1) — map gracefully for old DB records
    PENDING: "idle",
    ACCEPTED: "confirmed",
    REQUESTED: "searching",
    SEARCHING_DRIVER: "searching",
    // H2 fix: DRIVER_ASSIGNED means a driver was found → 'confirmed', not 'searching'
    DRIVER_ASSIGNED: "confirmed",
    // Post-ride payment: DRIVER_ACCEPTED always maps to 'confirmed' (no payment gate)
    DRIVER_ACCEPTED: "confirmed",
    // Post-ride model: PAID means payment collected after ride completes = ride fully done
    PAID: "finished",
    ARRIVED: "arrived",
    IN_PROGRESS: "in-progress",
    // Post-ride payment: COMPLETED → 'payment-required' until payment is confirmed
    COMPLETED: serverPaymentCompleted ? "finished" : "payment-required",
    CANCELLED: "idle",
    CANCELLED_BY_USER: "idle",
    CANCELLED_BY_DRIVER: "idle",
    CANCELLED_BY_SYSTEM: "idle",
  };

  return statusMap[backendStatus] ?? "idle";
}
