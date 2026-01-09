import { fetchWithAuth } from "@/services/auth-fetch";

export async function fetchStorePublicDetails() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/dashboard/public`
  );
}
