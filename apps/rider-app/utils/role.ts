/**
 * Utility functions for handling rider/driver role
 */

export type UserRole = "RIDER" | "DRIVER";

/**
 * Get the display name for the role
 */
export function getRoleLabel(role: UserRole | undefined): string {
  if (!role) return "Rider";
  return role === "DRIVER" ? "Driver" : "Rider";
}

/**
 * Get the capitalized role label
 */
export function getRoleLabelCaps(role: UserRole | undefined): string {
  return getRoleLabel(role).toUpperCase();
}

/**
 * Check if the user is a driver
 */
export function isDriver(role: UserRole | undefined): boolean {
  return role === "DRIVER";
}

/**
 * Check if the user is a rider
 */
export function isRider(role: UserRole | undefined): boolean {
  return !role || role === "RIDER";
}
