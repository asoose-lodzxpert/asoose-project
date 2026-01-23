import type {
  PersonalInfo,
  UpdatePersonalInfoDto,
} from "@/types/personal-info";
import { fetchWithAuth, fetchWithAuthMultipart } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export async function getPersonalInfo(): Promise<PersonalInfo> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/personal-info`,
    );
    return response.personalInfo;
  } catch (error) {
    console.error("Error fetching personal info:", error);
    throw error;
  }
}

export async function updatePersonalInfo(
  data: UpdatePersonalInfoDto,
): Promise<PersonalInfo> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/personal-info`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return response.personalInfo;
  } catch (error) {
    console.error("Error updating personal info:", error);
    throw error;
  }
}

export async function uploadProfileImage(imageUri: string): Promise<string> {
  try {
    // Create form data
    const formData = new FormData();
    const filename = imageUri.split("/").pop() || "profile.jpg";
    const match = /\.(\w+)$/.exec(filename);
    const type = match ? `image/${match[1]}` : "image/jpeg";

    formData.append("file", {
      uri: imageUri,
      name: filename,
      type,
    } as any);

    const response = await fetchWithAuthMultipart(
      `${EXPO_PUBLIC_API_URL}/riders/upload-profile-image`,
      formData,
    );

    return response.imageUrl;
  } catch (error) {
    console.error("Error uploading profile image:", error);
    throw error;
  }
}
