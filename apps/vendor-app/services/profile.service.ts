import { fetchWithAuth } from "./auth-fetch";
import { uploadFile } from "./storage.service";

const API = process.env.EXPO_PUBLIC_API_URL;

export async function fetchVendorProfile() {
  return await fetchWithAuth(`${API}/vendor/dashboard/me`);
}

export async function fetchStorePublicDetails() {
  return await fetchWithAuth(`${API}/vendor/dashboard/public`);
}

export async function fetchStoreBalance() {
  return await fetchWithAuth(`${API}/vendor/dashboard/balance`);
}

export async function updateVendorProfileImage(imageUri: string) {
  try {
    // Extract filename from URI
    const filename = imageUri.split("/").pop() || "profile.jpg";

    // Prepare file object for upload
    const file = {
      uri: imageUri,
      name: filename,
      type: "image/jpeg",
    };

    // Upload image to storage
    const imageUrl = await uploadFile(file);

    // Update vendor profile with new image URL
    const response = await fetchWithAuth(
      `${API}/vendor/dashboard/update-image`,
      {
        method: "PATCH",
        body: JSON.stringify({ image: imageUrl }),
      }
    );

    return response;
  } catch (error: any) {
    throw new Error(error.message || "Failed to update profile image");
  }
}
