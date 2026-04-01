import { format } from "date-fns";

/**
 * Formats a date string, Date object, or number into a 24-hour format string: DD/MM/YY HH:mm
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDateTime = (date: string | Date | number) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";
    return format(d, "dd/MM/yy HH:mm");
  } catch (error) {
    return "Invalid Date";
  }
};

/**
 * Formats a date string, Date object, or number into a date-only string: DD/MM/YY
 * @param date The date to format
 * @returns Formatted date string
 */
export const formatDateOnly = (date: string | Date | number) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";
    return format(d, "dd/MM/yy");
  } catch (error) {
    return "Invalid Date";
  }
};

/**
 * Formats a date string, Date object, or number into a time-only 24-hour string: HH:mm
 * @param date The date to format
 * @returns Formatted time string
 */
export const formatTimeOnly = (date: string | Date | number) => {
  if (!date) return "N/A";
  try {
    const d = new Date(date);
    if (isNaN(d.getTime())) return "Invalid Date";
    return format(d, "HH:mm");
  } catch (error) {
    return "Invalid Date";
  }
};
