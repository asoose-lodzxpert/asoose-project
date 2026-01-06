import { DeliveryHistoryItem } from "@/components/delivery/history/DeliveryHistoryList";
import deliveryData from "@/mock/delivery-history-data.json";

export async function fetchDeliveryHistory(
  tab: "active" | "completed",
  page: number,
  pageSize: number
): Promise<DeliveryHistoryItem[]> {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1000));
  const all = (deliveryData as DeliveryHistoryItem[]).filter(
    (d) => d.status === tab
  );
  return all.slice((page - 1) * pageSize, page * pageSize);
}
