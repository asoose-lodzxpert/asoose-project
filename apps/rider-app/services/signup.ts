import { SignupForm } from "@/types/signup";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface SignupResponse {
  rider: {
    id: string;
    name: string;
    email: string;
    phone: string;
    status: string;
  };
  message: string;
}

export async function registerRider(
  formData: SignupForm,
): Promise<SignupResponse> {
  try {
    const payload = {
      name: formData.fullName,
      email: formData.email,
      password: formData.password,
      role: formData.role, // RIDER or DRIVER
      countryCode: formData.phoneCode,
      phone: formData.phoneNumber,
      cityId: formData.cityId,

      // Vehicle information
      vehicleType: formData.vehicleType,
      vehicleBrand: formData.make,
      vehicleModel: formData.model,
      vehicleYear: formData.year ? parseInt(formData.year) : undefined,
      vehicleColor: formData.color,
      plateNumber: formData.plateNumber,

      // Documents (URLs after upload)
      driverLicense: formData.documents.driverLicense,
      vehicleInsurance: formData.documents.vehicleInsurance,
      vehicleRegistration: formData.documents.vehicleRegistration,

      // Bank account
      bankName: formData.bank,
      bankCode: "000", // Will be resolved by backend based on bank name
      accountNumber: formData.accountNumber,
      accountName: formData.accountName,

      // Additional info
      location: {
        lat: 0, // Will be updated when rider goes online
        lng: 0,
      },
    };

    const res = await fetch(`${EXPO_PUBLIC_API_URL}/auth/rider/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Registration failed");
    }

    const data = await res.json();
    return data;
  } catch (error) {
    // ...existing code...
    throw error;
  }
}

export async function uploadDocument(
  file: string,
  type: "idCard" | "driverLicense" | "vehicleInsurance" | "vehicleRegistration",
): Promise<string> {
  try {
    const formData = new FormData();

    // Convert URI to blob
    const response = await fetch(file);
    const blob = await response.blob();

    // Append file with proper metadata
    formData.append("file", blob as any, `${type}-${Date.now()}.jpg`);

    const res = await fetch(`${EXPO_PUBLIC_API_URL}/storage/upload-public`, {
      method: "POST",
      body: formData,
      headers: {},
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Failed to upload document");
    }

    const { url } = await res.json();
    return url;
  } catch (error) {
    // ...existing code...
    throw error;
  }
}
