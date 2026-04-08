export interface SignupStep1Data {
  businessName: string;
  businessEmail: string;
  businessEmailVerified: boolean;
  otpCode: string;
  otpSent: boolean;
  countryCode: string;
  phoneNumber: string;
  businessType: string;
  employees: string;
  password?: string;
}

export interface SignupStep2Data {
  businessRegCertUri?: string;
  businessRegCertName?: string;
  businessRegCertFile?: File;
  taxIdDocUri?: string;
  taxIdDocName?: string;
  taxIdDocFile?: File;
  proofOfAddressUri?: string;
  proofOfAddressName?: string;
  proofOfAddressFile?: File;
}

export interface OpenHour {
  open?: string;
  close?: string;
  closed?: boolean;
  is24Hours?: boolean;
}

export interface SignupStep3Data {
  storeName: string;
  storeDescription: string;
  storeLogoUri?: string;
  storeLogoName?: string;
  storeLogoFile?: File;
  storeBannerUri?: string;
  storeBannerName?: string;
  storeBannerFile?: File;
  address?: string;
  location?: {
    lat: number;
    lng: number;
  };
  openHours: Record<string, OpenHour>;
  cityId?: string;
  cityName?: string;
}

export interface SignupData {
  step1: SignupStep1Data;
  step2: SignupStep2Data;
  step3: SignupStep3Data;
  acceptedTerms: boolean;
}
