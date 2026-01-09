import { fetchWithAuth } from "./auth-fetch";

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
