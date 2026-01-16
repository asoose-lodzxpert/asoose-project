export interface PersonalInfo {
  id: string;
  fullName: string;
  address: string;
  phoneCode: string;
  phoneNumber: string;
  dob: string;
  state: string | null;
  city: string | null;
  email: {
    value: string;
    isVerified: boolean;
  };
  phone: {
    value: string;
    isVerified: boolean;
  };
  image?: string | null;
}

export interface UpdatePersonalInfoDto {
  fullName?: string;
  address?: string;
  phoneCode?: string;
  phoneNumber?: string;
  dob?: string;
  state?: string;
  city?: string;
  image?: string;
}

export interface PersonalInfoResponse {
  personalInfo: PersonalInfo;
}
