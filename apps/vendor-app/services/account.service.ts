import { fetchWithAuth } from "./auth-fetch";

const API = process.env.EXPO_PUBLIC_API_URL;

interface AccountDeletionRequest {
  reasons: string[];
  additionalInfo?: string;
}

export async function requestAccountDeletion(
  data: AccountDeletionRequest
): Promise<{ message: string }> {
  return await fetchWithAuth(`${API}/vendor/account/deletion-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

export async function checkDeletionStatus(): Promise<{
  isPendingDeletion: boolean;
  deletionRequestedAt?: string;
  reasons?: string[];
}> {
  return await fetchWithAuth(`${API}/vendor/account/deletion-status`);
}
