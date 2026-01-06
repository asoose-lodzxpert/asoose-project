export const BUSINESS_TYPES = [
  "Restaurant",
  "Retail",
  "Service",
  "Online Store",
  "Other",
] as const;
export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const EMPLOYEE_RANGES = [
  "1-5",
  "6-10",
  "11-20",
  "21-50",
  "51-100",
  "100+",
] as const;
export type EmployeeRange = (typeof EMPLOYEE_RANGES)[number];

export const COUNTRY_CODES = ["+1", "+44", "+234", "+91"] as const;
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
