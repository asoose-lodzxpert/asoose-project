import { post } from "@/lib/authFetch";

/**
 * Sends a request to delete the user's account with a given reason.
 */
export const deleteAccountRequest = async (reason: string): Promise<void> => {
  await post("/users/delete-account", { reason });
};
