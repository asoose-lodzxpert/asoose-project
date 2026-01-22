import type { BankAccount, UpdateBankAccountDto } from "@/types/bank-account";
import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL =
  process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000/api/v1";

export async function getBankAccount(): Promise<BankAccount | null> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/bank-account`,
    );
    return response.bankAccount || null;
  } catch (error) {
    console.error("Error fetching bank account:", error);
    throw error;
  }
}

export async function updateBankAccount(
  data: UpdateBankAccountDto,
): Promise<BankAccount> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/riders/bank-account`,
      {
        method: "PATCH",
        body: JSON.stringify(data),
      },
    );
    return response.bankAccount;
  } catch (error) {
    console.error("Error updating bank account:", error);
    throw error;
  }
}
