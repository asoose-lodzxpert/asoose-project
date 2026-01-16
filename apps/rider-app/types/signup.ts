export type SignupStep = 1 | 2 | 3 | 4;

export type VehicleType = "bicycle" | "motorcycle" | "car" | "walking" | null;

export interface SignupForm {
  // Step 1 - Personal Details
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  address: string;
  phoneCode: string;
  phoneNumber: string;
  dob: string;
  language: string | null;
  state: string | null;
  city: string | null;

  // Step 2 - Vehicle Info
  vehicleType: VehicleType;
  make: string;
  model: string;
  year: string;
  color: string;
  plateNumber: string;
  documents: {
    idCard: string | null;
    driverLicense: string | null;
    vehicleInsurance: string | null;
    vehicleRegistration: string | null;
  };

  // Step 3 - Bank Account Details
  bank: string | null;
  accountNumber: string;
  accountName: string;
}
