import { fetchWithAuth } from "./auth-fetch";
import {
  WithdrawalInfo,
  CreateWithdrawalDto,
  WithdrawalResponse,
} from "../types/withdrawal";

const API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getWithdrawalInfo = async (): Promise<WithdrawalInfo> => {
  const response = await fetchWithAuth(`${API_URL}/riders/withdrawal-info`);
  if (!response.ok) {
    throw new Error("Failed to fetch withdrawal info");
  }
  return response.json();
};

export const requestWithdrawal = async (
  data: CreateWithdrawalDto
): Promise<WithdrawalResponse> => {
  const response = await fetchWithAuth(`${API_URL}/riders/withdraw`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || "Failed to request withdrawal");
  }

  return response.json();
};
