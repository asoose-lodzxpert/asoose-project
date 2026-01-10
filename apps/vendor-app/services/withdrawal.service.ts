import { fetchWithAuth } from "./auth-fetch";

export interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
}

export interface Withdrawal {
  id: string;
  amount: number;
  status: "PENDING" | "APPROVED" | "REJECTED" | "COMPLETED";
  bankName: string;
  accountNumber: string;
  createdAt: string;
  processedAt?: string;
  rejectionReason?: string;
  referenceNumber?: string;
}

export async function fetchStoreBalance() {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/balance`
  );
}

export async function fetchBankAccounts(): Promise<BankAccount[]> {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/bank-accounts`
  );
}

export async function createWithdrawal(data: {
  amount: number;
  bankAccountId: string;
}) {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/withdrawals`,
    {
      method: "POST",
      body: JSON.stringify(data),
    }
  );
}

export async function fetchWithdrawalHistory(): Promise<Withdrawal[]> {
  return await fetchWithAuth(
    `${process.env.EXPO_PUBLIC_API_URL}/vendor/withdrawals`
  );
}
