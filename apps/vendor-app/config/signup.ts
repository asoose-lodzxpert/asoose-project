export const BUSINESS_TYPES = [
  "Restaurant",
  "Retail",
  "Service",
  "Online Store",
  "Other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

// Definition for BusinessType
/**
 * Type representing possible business types.
 * - "Restaurant"
 * - "Retail"
 * - "Service"
 * - "Online Store"
 * - "Other"
 */
export type BusinessTypeDef =
  | "Restaurant"
  | "Retail"
  | "Service"
  | "Online Store"
  | "Other";

export const EMPLOYEE_RANGES = [
  "1-5",
  "6-10",
  "11-20",
  "21-50",
  "51-100",
  "100+",
] as const;

// Definition for EmployeeRange
/**
 * Type representing possible employee ranges.
 * - "1-5"
 * - "6-10"
 * - "11-20"
 * - "21-50"
 * - "51-100"
 * - "100+"
 */
export type EmployeeRange = (typeof EMPLOYEE_RANGES)[number];

export const COUNTRY_CODES = ["+1", "+44", "+234", "+91"] as const;

// Definition for CountryCode
/**
 * Type representing possible country codes.
 * - "+1"
 * - "+44"
 * - "+234"
 * - "+91"
 */
export type CountryCode = (typeof COUNTRY_CODES)[number];

export const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

// Definition for Day
/**
 * Type representing days of the week.
 * - "monday"
 * - "tuesday"
 * - "wednesday"
 * - "thursday"
 * - "friday"
 * - "saturday"
 * - "sunday"
 */
export type DayDef =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";
