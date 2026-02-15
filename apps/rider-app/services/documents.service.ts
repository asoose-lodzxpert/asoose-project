import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export type DocumentStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface RiderDocument {
  id: string;
  type: string;
  url: string;
  status: DocumentStatus;
}

export async function getDocuments(): Promise<RiderDocument[]> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/profile/me`,
    );
    return response.documents || [];
  } catch (error: any) {
    throw new Error(
      error.response?.data?.message || "Failed to fetch documents",
    );
  }
}
