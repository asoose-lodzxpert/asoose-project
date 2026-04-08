import { BusinessType, EmployeeRange, CountryCode } from "@/config/signup";

export interface SignupStep1Data {
  businessName: string;
  businessEmail: string;
  businessEmailVerified: boolean;
  otpCode: string;
  otpSent: boolean;
  countryCode: CountryCode | "";
  phoneNumber: string;
  businessType: BusinessType | "";
  employees: EmployeeRange | "";
  password: string;
}

export interface SignupStep2Data {
  businessRegCertUri?: string;
  businessRegCertName?: string;
  taxIdDocUri?: string;
  taxIdDocName?: string;
  proofOfAddressUri?: string;
  proofOfAddressName?: string;
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
  storeLogoUri?: string;
  storeLogoName?: string;
  storeBannerUri?: string;
  storeBannerName?: string;
  location?: { lat: number; lng: number };
  openHours?: OpenHours;
  cityId?: string;
  cityName?: string;
}

export interface SignupData {
  step1: SignupStep1Data;
  step2: SignupStep2Data;
  step3: SignupStep3Data;
  acceptedTerms: boolean;
}
