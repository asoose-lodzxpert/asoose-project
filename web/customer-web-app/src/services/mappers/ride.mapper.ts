/**
 * Ride Mapper
 * 
 * Transforms Backend Ride → RideViewModel
 * 
 * This is THE canonical transformation layer.
 * All data mismatches, field renames, null safety handled here.
 * 
 * RULES:
 * - Backend Ride is source of truth
 * - All fields must have safe defaults
 * - No property access without null checks
 * - RideViewModel always safe for UI consumption
 */

import type {
  BackendRide,
  RideViewModel,
  AddressView,
  DriverView,
  RideStatus,
} from '@/types/ride-view-model';
import { formatRideStatus } from '../formatters/ride-status.formatter';

/**
 * Transform address components into displayable addressText
 * 
 * Input: street, city, state (optional, may fail)
 * Output: "${street}, ${city}, ${state}" or "Pinned Location"
 * 
 * Safe: Returns string at minimum
 */
function constructAddressText(
  street?: string,
  city?: string,
  state?: string
): string {
  // Filter empty, nullish, or placeholder strings (legacy 'Unknown' records)
  const parts = [street, city, state].filter(
    (p): p is string => Boolean(p) && p?.toLowerCase() !== 'unknown'
  );
  
  // Return constructed address or fallback
  return parts.length > 0 ? parts.join(', ') : 'Pinned Location';
}

/**
 * Transform backend address object → AddressView
 * 
 * Backend returns: { street, city, state, lat, lng, ... }
 * Frontend displays: { addressText, lat, lng }
 * 
 * Safe: All coordinates default to null, addressText always populated
 */
function mapAddress(backendAddress?: {
  street?: string;
  city?: string;
  state?: string;
  lat?: number;
  lng?: number;
}): AddressView {
  return {
    addressText: constructAddressText(
      backendAddress?.street,
      backendAddress?.city,
      backendAddress?.state
    ),
    lat: backendAddress?.lat ?? null,
    lng: backendAddress?.lng ?? null,
    street: backendAddress?.street,
    city: backendAddress?.city,
    state: backendAddress?.state,
  };
}

/**
 * Transform backend rider object → DriverView
 * 
 * Backend returns: rider.vehicle.plateNumber
 * Frontend displays: driver.vehicleNumber
 * 
 * Safe: All fields have sensible nulls, no undefined shocks
 */
function mapDriver(
  rider?: {
    id?: string;
    name?: string;
    image?: string;
    rating?: number;
    vehicle?: {
      plateNumber?: string;
      brand?: string;
      model?: string;
    };
  }
): DriverView | undefined {
  // If no rider exists, driver is undefined
  if (!rider?.id || !rider?.name) {
    return undefined;
  }

  return {
    id: rider.id,
    name: rider.name,
    image: rider.image ?? null,
    rating: rider.rating ?? null,
    vehicleNumber: rider.vehicle?.plateNumber ?? null,
    vehicleBrand: rider.vehicle?.brand ?? null,
    vehicleModel: rider.vehicle?.model ?? null,
  };
}

/**
 * Transform backend ride → RideViewModel
 * 
 * Main transformation function. Handles:
 * - Field renames (rider → driver, totalFare → actualFare)
 * - Address construction (street/city/state → addressText)
 * - Status formatting (IN_PROGRESS → "In Progress")
 * - Date parsing (ISO string → Date or undefined)
 * - Safe defaults for all nullable fields
 * 
 * Guarantees:
 * - Never throws (all errors caught and defaults used)
 * - No undefined field access (all optional fields checked)
 * - RideViewModel always production-safe
 */
export function mapRideToViewModel(backendRide: BackendRide): RideViewModel {
  try {
    // Core ID and status are always required
    if (!backendRide.id || !backendRide.status) {
      throw new Error('Invalid ride: missing id or status');
    }

    // ========== ADDRESSES ==========
    // CRITICAL: Map backend address → AddressView with safe construction
    const pickupAddress = mapAddress(backendRide.pickupAddress);
    const dropoffAddress = mapAddress(backendRide.dropoffAddress);

    // ========== DRIVER ==========
    // CRITICAL: Map backend rider → driver (rename + flatten)
    const driver = mapDriver(backendRide.rider);

    // ========== PRICING ==========
    // Map totalFare (backend) → actualFare (frontend)
    // Priority: totalFare > estimatedFare > 0
    const actualFare = backendRide.totalFare ?? backendRide.estimatedFare ?? 0;

    // ========== STATUS ==========
    // Format status enum to human-readable
    const statusLabel = formatRideStatus(backendRide.status as RideStatus);

    // ========== TIMESTAMPS ==========
    // Parse ISO timestamps safely
    const parseDate = (isoString?: string): Date | undefined => {
      if (!isoString) return undefined;
      try {
        const date = new Date(isoString);
        return isNaN(date.getTime()) ? undefined : date;
      } catch {
        return undefined;
      }
    };

    // ========== BUILD VIEW MODEL ==========
    const viewModel: RideViewModel = {
      // Core
      id: backendRide.id,
      status: backendRide.status as RideStatus,
      statusLabel,

      // Addresses (guaranteed safe, never undefined)
      pickupAddress,
      dropoffAddress,

      // Driver (optional, safe if undefined)
      ...(driver && { driver }),

      // Pricing
      actualFare,
      ...(backendRide.estimatedFare !== undefined && {
        estimatedFare: backendRide.estimatedFare,
      }),

      // Distance & Duration
      ...(backendRide.distanceKm !== undefined && {
        distanceKm: backendRide.distanceKm,
      }),
      ...(backendRide.durationMin !== undefined && {
        durationMin: backendRide.durationMin,
      }),

      // Timestamps
      ...(parseDate(backendRide.completedAt) && {
        completedTime: parseDate(backendRide.completedAt),
      }),
      ...(parseDate(backendRide.acceptedAt) && {
        acceptedTime: parseDate(backendRide.acceptedAt),
      }),
      ...(parseDate(backendRide.startedAt) && {
        startedTime: parseDate(backendRide.startedAt),
      }),
      
      // Always required
      createdAt: parseDate(backendRide.createdAt) ?? new Date(),

      // Metadata
      ...(backendRide.paymentStatus && { paymentStatus: backendRide.paymentStatus }),
      ...(backendRide.payment?.method && { paymentMethod: backendRide.payment.method }),
      ...(backendRide.cancellationReason && {
        cancellationReason: backendRide.cancellationReason,
      }),
    };

    return viewModel;
  } catch (error) {
    console.error('[RideMapper] Transformation failed:', error, backendRide);
    
    // Return minimal safe fallback to prevent UI crash
    return {
      id: backendRide.id ?? 'unknown',
      status: backendRide.status ?? 'PENDING',
      statusLabel: 'Unknown',
      pickupAddress: {
        addressText: 'Pinned Location',
        lat: null,
        lng: null,
      },
      dropoffAddress: {
        addressText: 'Pinned Location',
        lat: null,
        lng: null,
      },
      actualFare: 0,
      createdAt: new Date(),
    };
  }
}

/**
 * Map array of backend rides → array of ViewModels
 * Useful for ride history page
 */
export function mapRidesToViewModels(backendRides: BackendRide[]): RideViewModel[] {
  return backendRides.map(mapRideToViewModel);
}

/**
 * Validate coordinate safety before map render
 */
export function hasValidCoordinates(address: AddressView): boolean {
  return (
    address.lat !== null &&
    address.lng !== null &&
    typeof address.lat === 'number' &&
    typeof address.lng === 'number' &&
    !isNaN(address.lat) &&
    !isNaN(address.lng)
  );
}
