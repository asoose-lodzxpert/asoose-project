export const BUSINESS_TYPES = [
  "Restaurant & Cafe",
  "Fast Food",
  "Food Delivery",
  "Grocery & Supermarket",
  "Pharmacy",
  "Fashion & Clothing",
  "Electronics & Gadgets",
  "Home & Furniture",
  "Beauty & Personal Care",
  "Health & Fitness",
  "Education & Tutoring",
  "Professional Services",
  "Automotive",
  "Travel & Tourism",
  "Entertainment",
  "Retail Shop",
  "Online Store",
  "Manufacturing",
  "Logistics & Shipping",
  "Bookstore",
  "Pet Store",
  "Bakery",
  "Florist",
  "Jewelry",
  "Sports & Outdoors",
  "Toys & Games",
  "Stationery",
  "Hardware",
  "Supermarket",
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
