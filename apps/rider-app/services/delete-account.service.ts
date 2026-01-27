// Service for deleting a user account
import axios from "axios";

/**
 * Delete the current user's account with a reason
 * @param reason string
 */
export async function deleteAccount(reason: string): Promise<void> {
  // Replace with your actual API endpoint
  const endpoint = "/api/account/delete";
  await axios.post(endpoint, { reason });
}
