import { SignupForm } from "@/types/signup";

const API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

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
  formData: SignupForm
): Promise<SignupResponse> {
  try {
    const payload = {
      name: formData.fullName,
      email: formData.email,
      password: formData.password,
      countryCode: formData.phoneCode,
      phone: formData.phoneNumber,

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

    const res = await fetch(`${API_URL}/auth/rider/register`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
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
    console.error("Registration error:", error);
    throw error;
  }
}

export async function uploadDocument(
  file: string,
  type: "idCard" | "driverLicense" | "vehicleInsurance" | "vehicleRegistration"
): Promise<string> {
  try {
    // Create FormData for file upload
    const formData = new FormData();

    // Extract file info from base64 or file URI
    const fileBlob = await fetch(file).then((r) => r.blob());
    formData.append("file", fileBlob, `${type}-${Date.now()}.jpg`);
    formData.append("type", type);

    const res = await fetch(`${API_URL}/storage/upload`, {
      method: "POST",
      body: formData,
    });

    if (!res.ok) {
      throw new Error("Failed to upload document");
    }

    const { url } = await res.json();
    return url;
  } catch (error) {
    console.error("Upload error:", error);
    throw error;
  }
}
