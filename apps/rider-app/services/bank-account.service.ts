import type { BankAccount, UpdateBankAccountDto } from "@/types/bank-account";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

export interface Bank {
  id: string;
  name: string;
  code: string;
}

export async function getBanks(): Promise<Bank[]> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/bank/banks`,
      { method: "GET" },
    );
    return Array.isArray(response) ? response : [];
  } catch {
    return [];
  }
}

export async function verifyAccountNumber(
  bankCode: string,
  accountNumber: string,
): Promise<{ accountName: string; accountNumber: string }> {
  return await fetchWithAuth(
    `${EXPO_PUBLIC_API_URL}/rider/bank/verify-account`,
    {
      method: "POST",
      body: JSON.stringify({ bankCode, accountNumber }),
    },
  );
}

export async function getBankAccount(): Promise<BankAccount | null> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/bank/account`,
    );
    return response.bankAccount || null;
  } catch (error) {
    // ...existing code...
    throw error;
  }
}

export async function updateBankAccount(
  data: UpdateBankAccountDto,
): Promise<BankAccount> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/rider/bank/account`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return response.bankAccount;
  } catch (error) {
    // ...existing code...
    throw error;
  }
}
