import {
  CreateWithdrawalDto,
  WithdrawalInfo,
  WithdrawalResponse,
} from "../types/withdrawal";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export const getWithdrawalInfo = async (): Promise<WithdrawalInfo> => {
  // ...existing code...
  try {
    return await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/rider/withdrawal/info`);
  } catch (err) {
    // ...existing code...
    throw err;
  }
};

export const requestWithdrawal = async (
  data: CreateWithdrawalDto,
): Promise<WithdrawalResponse> => {
  try {
    return await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/withdrawal/request`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      },
    );
  } catch (err) {
    // ...existing code...
    throw err;
  }
};
