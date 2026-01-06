export type SignupStep = 1 | 2 | 3 | 4;

export type VehicleType = "bicycle" | "motorcycle" | "car" | "walking" | null;

export interface SignupForm {
  // Step 1
  fullName: string;
  address: string;
  phoneCode: string;
  phoneNumber: string;
  dob: string;
  language: string | null;
  state: string | null;
  city: string | null;

  // Step 2
  vehicleType: VehicleType;
  make: string;
  model: string;
  color: string;
  plateNumber: string;
  documents: {
    id: File | null;
    license: File | null;
    insurance: File | null;
  };

  // Step 3
  bank: string | null;
  accountNumber: string;
  accountName: string;
}
