import { get } from "@/lib/authFetch";
import { DeliveryHistoryItem } from "@/components/delivery/history/DeliveryHistoryList";

// Fetch delivery history from backend
export async function fetchDeliveryHistory(
  tab: "active" | "completed",
  page: number,
  pageSize: number,
): Promise<DeliveryHistoryItem[]> {
  const status = tab === "active" ? "active" : "completed";
  const params = new URLSearchParams({
    status,
    page: String(page),
    pageSize: String(pageSize),
  });
  return get(`/users/deliveries?${params.toString()}`);
}
