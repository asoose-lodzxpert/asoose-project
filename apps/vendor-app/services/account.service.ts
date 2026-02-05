import { fetchWithAuth } from "./auth-fetch";

const API = process.env.EXPO_PUBLIC_API_URL;

/**
 * Type representing the request body for account deletion.
 * - reasons: string[] (required)
 * - additionalInfo?: string (optional)
 */
interface AccountDeletionRequest {
  reasons: string[];
  additionalInfo?: string;
}

/**
 * Request account deletion for the vendor.
 * @param data - { reasons: string[], additionalInfo?: string }
 * @returns { message: string }
 */
export async function requestAccountDeletion(
  data: AccountDeletionRequest,
): Promise<{ message: string }> {
  return await fetchWithAuth(`${API}/vendor/account/deletion-request`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });
}

/**
 * Check the current account deletion status for the vendor.
 * @returns {
 *   isPendingDeletion: boolean;
 *   deletionRequestedAt?: string;
 *   reasons?: string[];
 * }
 */
export async function checkDeletionStatus(): Promise<{
  isPendingDeletion: boolean;
  deletionRequestedAt?: string;
  reasons?: string[];
}> {
  return await fetchWithAuth(`${API}/vendor/account/deletion-status`);
}
