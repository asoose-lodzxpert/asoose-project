import { fetchWithAuth } from "./auth-fetch";

const EXPO_PUBLIC_API_URL = process.env.EXPO_PUBLIC_API_URL;

interface BankAccountData {
  bankName: string;
  bankCode: string;
  accountNumber: string;
  accountName: string;
}

interface Bank {
  id: string;
  name: string;
  code: string;
}

export async function getBanks(): Promise<Bank[]> {
  try {
    const response = await fetchWithAuth(
      `${EXPO_PUBLIC_API_URL}/vendor/dashboard/banks`,
      {
        method: "GET",
      },
    );
    // Ensure we always return an array
    return Array.isArray(response) ? response : [];
  } catch (error) {
    return []; // Return empty array on error
  }
}

export async function verifyAccountNumber(
  bankCode: string,
  accountNumber: string,
): Promise<{ accountName: string }> {
  const response = await fetchWithAuth(
    `${EXPO_PUBLIC_API_URL}/vendor/dashboard/verify-account`,
    {
      method: "POST",
      body: JSON.stringify({ bankCode, accountNumber }),
    },
  );
  return response;
}

export async function getBankAccount(): Promise<BankAccountData | null> {
  const response = await fetchWithAuth(
    `${EXPO_PUBLIC_API_URL}/vendor/dashboard/bank-account`,
    {
      method: "GET",
    },
  );
  return response;
}

export async function saveBankAccount(
  data: BankAccountData,
): Promise<BankAccountData> {
  const response = await fetchWithAuth(
    `${EXPO_PUBLIC_API_URL}/vendor/dashboard/bank-account`,
    {
      method: "POST",
      body: JSON.stringify(data),
    },
  );
  return response;
}

export async function deleteBankAccount(): Promise<void> {
  await fetchWithAuth(`${EXPO_PUBLIC_API_URL}/vendor/dashboard/bank-account`, {
    method: "DELETE",
  });
}
