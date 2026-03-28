/**
 * Absolute Timestamp Formatter
 * Formats notification timestamps to absolute date-time format
 * Format: "Month Day, Year, HH:mm" (e.g., "March 28, 2026, 14:35")
 * 
 * Features:
 * - Timezone-aware using Intl.DateTimeFormat
 * - Locale-aware (uses en-NG for Nigerian standardization)
 * - Handles edge cases (invalid/missing dates)
 * - Consistent formatting across all notifications
 */

/**
 * Parse various date formats into a Date object
 * Handles: ISO strings, Unix timestamps, date objects
 */
function parseDate(dateInput?: string | Date | number): Date | null {
  if (!dateInput) return null;

  try {
    let date: Date;

    // If already a Date object
    if (dateInput instanceof Date) {
      date = dateInput;
    }
    // If it's a string (ISO or other format)
    else if (typeof dateInput === "string") {
      date = new Date(dateInput);
    }
    // If it's a Unix timestamp (number)
    else if (typeof dateInput === "number") {
      date = new Date(dateInput);
    } else {
      return null;
    }

    // Validate the parsed date
    if (!isNaN(date.getTime())) {
      return date;
    }

    return null;
  } catch (error) {
    console.warn("Failed to parse date:", dateInput, error);
    return null;
  }
}

/**
 * Format a date to absolute timestamp format
 * @param dateInput - ISO string, Unix timestamp, or Date object
 * @returns Formatted string like "March 28, 2026, 14:35" or fallback for invalid dates
 * 
 * @example
 * formatAbsoluteTimestamp("2026-03-28T14:35:00Z") // "March 28, 2026, 14:35"
 * formatAbsoluteTimestamp(1711620900000) // "March 28, 2026, 14:35"
 * formatAbsoluteTimestamp(null) // "Unknown date" (fallback)
 */
export function formatAbsoluteTimestamp(dateInput?: string | Date | number): string {
  const date = parseDate(dateInput);

  if (!date) {
    return "Unknown date";
  }

  try {
    // Use Intl.DateTimeFormat for locale-aware, timezone-aware formatting
    const formatter = new Intl.DateTimeFormat("en-NG", {
      year: "numeric",
      month: "long", // Full month name (January, February, etc.)
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false, // 24-hour format (14:35 not 2:35 PM)
      timeZone: "Africa/Lagos", // Nigeria timezone (can be adjusted per user)
    });

    // Format the date
    const formatted = formatter.format(date);

    // Intl.DateTimeFormat returns "March 28, 2026, 14:35" with the above options
    return formatted;
  } catch (error) {
    console.warn("Error formatting timestamp:", dateInput, error);
    return "Invalid date";
  }
}

/**
 * Format a date to absolute timestamp with optional custom timezone
 * @param dateInput - ISO string, Unix timestamp, or Date object
 * @param options - Custom formatting options
 * @returns Formatted string
 */
export interface FormatOptions {
  timezone?: string; // IANA timezone (default: "Africa/Lagos")
  locale?: string; // BCP 47 language tag (default: "en-NG")
  includeTime?: boolean; // Include time component (default: true)
}

export function formatAbsoluteTimestampWithOptions(
  dateInput?: string | Date | number,
  options: FormatOptions = {}
): string {
  const {
    timezone = "Africa/Lagos",
    locale = "en-NG",
    includeTime = true,
  } = options;

  const date = parseDate(dateInput);

  if (!date) {
    return "Unknown date";
  }

  try {
    const formatterOptions: Intl.DateTimeFormatOptions = {
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone: timezone,
    };

    if (includeTime) {
      formatterOptions.hour = "2-digit";
      formatterOptions.minute = "2-digit";
      formatterOptions.hour12 = false;
    }

    const formatter = new Intl.DateTimeFormat(locale, formatterOptions);
    return formatter.format(date);
  } catch (error) {
    console.warn("Error formatting timestamp with options:", dateInput, options, error);
    return "Invalid date";
  }
}

/**
 * Get a human-readable timezone name from IANA timezone
 */
export function getTimezoneDisplay(timeZone: string): string {
  try {
    const formatter = new Intl.DateTimeFormat("en-NG", {
      timeZone,
      timeZoneName: "short",
    });
    return formatter.format(new Date()).split(" ").pop() || timeZone;
  } catch {
    return timeZone;
  }
}

/**
 * Validate if a date string is a valid date
 */
export function isValidDate(dateInput?: string | Date | number): boolean {
  return parseDate(dateInput) !== null;
}
