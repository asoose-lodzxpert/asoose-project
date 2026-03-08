/**
 * Vendor Availability Utility
 *
 * Determines whether a store is currently open, taking into account:
 *  1. `isOpen`       — manual toggle set by the vendor
 *  2. `openingHours` — structured table (dayOfWeek, openTime, closeTime) - preferred
 *  3. `openHours`    — legacy JSON blob stored during signup (fallback)
 *
 * If no schedule is configured the store is treated as open (no schedule = no restriction).
 */

export type AvailabilityReason =
  | 'OPEN'
  | 'MANUAL_CLOSE'
  | 'OUTSIDE_HOURS'
  | 'NO_SCHEDULE';

export interface AvailabilityResult {
  open: boolean;
  reason: AvailabilityReason;
  /** Human-readable message suitable for returning to the client */
  message: string;
}

interface OpeningHourRow {
  dayOfWeek: number; // 0 = Sunday … 6 = Saturday
  openTime: string;  // "09:00"
  closeTime: string; // "22:00"
}

interface StoreAvailabilityInput {
  isOpen: boolean;
  openingHours: OpeningHourRow[];
  openHours?: any; // legacy JSON — shape: { monday: { open, close, closed, is24Hours }, … }
  timezone?: string; // IANA tz (e.g. "Africa/Lagos"). Defaults to Africa/Lagos.
}

/**
 * Returns the current wall-clock time in the given IANA timezone as a plain Date object
 * whose .getHours() / .getMinutes() / .getDay() reflect local time in that zone.
 */
function nowInTimezone(tz: string): Date {
  try {
    return new Date(new Date().toLocaleString('en-US', { timeZone: tz }));
  } catch {
    // Fallback if tz string is invalid
    return new Date(new Date().toLocaleString('en-US', { timeZone: 'Africa/Lagos' }));
  }
}

/** Converts "HH:MM" string to total minutes since midnight */
function toMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

const LEGACY_DAY_KEYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;

export function isStoreCurrentlyOpen(
  store: StoreAvailabilityInput,
): AvailabilityResult {
  // ── 1. Manual toggle ──────────────────────────────────────────────────────
  if (!store.isOpen) {
    return {
      open: false,
      reason: 'MANUAL_CLOSE',
      message: 'This store is temporarily closed by the vendor.',
    };
  }

  const tz = store.timezone ?? 'Africa/Lagos';
  const now = nowInTimezone(tz);
  const dayOfWeek = now.getDay(); // 0 = Sunday
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  // ── 2. Structured openingHours (preferred) ───────────────────────────────
  if (store.openingHours && store.openingHours.length > 0) {
    const todayHours = store.openingHours.find(
      (h) => h.dayOfWeek === dayOfWeek,
    );

    // Day not in schedule = store is closed that day
    if (!todayHours) {
      return {
        open: false,
        reason: 'OUTSIDE_HOURS',
        message: 'This store is not open today.',
      };
    }

    const openMin = toMinutes(todayHours.openTime);
    const closeMin = toMinutes(todayHours.closeTime);

    if (currentMinutes < openMin || currentMinutes >= closeMin) {
      const fmt = (m: number) => {
        const h = Math.floor(m / 60);
        const min = m % 60;
        const period = h >= 12 ? 'PM' : 'AM';
        const displayH = h % 12 || 12;
        return `${displayH}:${String(min).padStart(2, '0')} ${period}`;
      };
      return {
        open: false,
        reason: 'OUTSIDE_HOURS',
        message: `This store is currently closed. Opening hours today: ${fmt(openMin)} – ${fmt(closeMin)}.`,
      };
    }

    return { open: true, reason: 'OPEN', message: 'Store is open.' };
  }

  // ── 3. Legacy openHours JSON fallback ────────────────────────────────────
  if (store.openHours && typeof store.openHours === 'object') {
    const dayKey = LEGACY_DAY_KEYS[dayOfWeek];
    const dayData = (store.openHours as Record<string, any>)[dayKey];

    if (!dayData || dayData.closed === true) {
      return {
        open: false,
        reason: 'OUTSIDE_HOURS',
        message: 'This store is not open today.',
      };
    }

    if (dayData.is24Hours === true) {
      return { open: true, reason: 'OPEN', message: 'Store is open.' };
    }

    if (dayData.open && dayData.close) {
      const openMin = toMinutes(dayData.open);
      const closeMin = toMinutes(dayData.close);

      if (currentMinutes < openMin || currentMinutes >= closeMin) {
        return {
          open: false,
          reason: 'OUTSIDE_HOURS',
          message: `This store is currently outside its operating hours (${dayData.open} – ${dayData.close}).`,
        };
      }
    }

    return { open: true, reason: 'OPEN', message: 'Store is open.' };
  }

  // ── 4. No schedule configured — treat as open ─────────────────────────
  return {
    open: true,
    reason: 'NO_SCHEDULE',
    message: 'Store is open.',
  };
}
