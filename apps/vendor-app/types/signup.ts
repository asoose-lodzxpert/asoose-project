import { BusinessType, EmployeeRange, CountryCode } from "@/config/signup";

export interface SignupStep1Data {
  businessName: string;
  businessEmail: string;
  countryCode: CountryCode | "";
  phoneNumber: string;
  businessType: BusinessType | "";
  employees: EmployeeRange | "";
  password: string;
}

export interface SignupStep2Data {
  businessRegCert?: string;
  taxIdDoc?: string;
  proofOfAddress?: string;
}

export type DayOfWeek =
  | "monday"
  | "tuesday"
  | "wednesday"
  | "thursday"
  | "friday"
  | "saturday"
  | "sunday";

export interface OpenHour {
  open: string;
  close: string;
  closed: boolean;
  is24Hours: boolean;
}

export type OpenHours = Partial<Record<DayOfWeek, OpenHour>>;

export interface SignupStep3Data {
  storeName: string;
  storeDescription: string;
  storeLogo?: string;
  storeBanner?: string;
  location?: { lat: number; lng: number };
  openHours?: OpenHours;
}

export interface SignupData {
  step1: SignupStep1Data;
  step2: SignupStep2Data;
  step3: SignupStep3Data;
}
