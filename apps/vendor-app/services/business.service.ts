import { fetchWithAuth } from "./auth-fetch";

const API = process.env.EXPO_PUBLIC_API_URL;

export async function updateBusinessInfo(data: any) {
  return fetchWithAuth(`${API}/auth/vendor/business-info`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateBusinessDocuments(data: any) {
  return fetchWithAuth(`${API}/auth/vendor/business-documents`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

export async function updateStoreDetails(data: any) {
  return fetchWithAuth(`${API}/auth/vendor/store-details`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}
