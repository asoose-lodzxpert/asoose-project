import { CurrentJob } from "@/types/job";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

interface HistoryResponse {
  data: CurrentJob[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export async function getAllJobs(
  status?: string,
  page: number = 1,
  limit: number = 20,
): Promise<HistoryResponse> {
  try {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: limit.toString(),
    });
    if (status) {
      params.append("status", status);
    }
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/order/history?${params}`,
    );
    return response;
  } catch (error) {
    // ...existing code...
    throw error;
  }
}
