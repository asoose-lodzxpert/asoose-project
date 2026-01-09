import { fetchWithAuth } from "@/services/auth-fetch";
import { StoreMetrics, StoreOrder } from "@/types/store";

export async function fetchStoreMetrics() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/dashboard/metrics`
  );
}

export async function fetchStoreOrders() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/dashboard/orders`
  );
}

export async function fetchStoreOnlineStatus() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/dashboard/is-online`
  );
}

export async function toggleStoreOnline() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/dashboard/toggle-online`,
    {
      method: "POST",
    }
  );
}
