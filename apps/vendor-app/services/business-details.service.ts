import { fetchWithAuth } from "./auth-fetch";

const API = process.env.EXPO_PUBLIC_API_URL;

export async function getBusinessDetails() {
  return fetchWithAuth(`${API}/auth/vendor/business-details`);
}
