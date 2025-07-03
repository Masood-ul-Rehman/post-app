import { useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useState } from "react";

/**
 * Custom hook to save an Instagram account to the backend.
 * Cleans the data and handles errors robustly.
 *
 * @returns { saveInstagramAccount, isLoading, error }
 */
export function useSaveInstagramAccount() {
  const addAccount = useMutation(api.metaAccounts.mutations.addAccount);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Save an Instagram account to the backend.
   * @param {object} data - The account data from the OAuth flow.
   * @param {string} userId - The user ID to associate the account with.
   * @returns {Promise<void>}
   */
  const saveInstagramAccount = async (data: any, userId: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const cleaned = { ...data };
      cleaned.userId = userId;
      if (!cleaned.accountType) cleaned.accountType = "instagram";
      if (!cleaned.pageId)
        cleaned.pageId = cleaned.igBusinessId || cleaned.username;
      if (!cleaned.userAccountId)
        cleaned.userAccountId = cleaned.igBusinessId || cleaned.username;
      if (!cleaned.pagePermissions && cleaned.permissions)
        cleaned.pagePermissions = cleaned.permissions;
      // Remove extra fields not in metaAccounts validator
      delete cleaned.expiresAt;
      delete cleaned.permissions;
      delete cleaned.metadata;
      delete cleaned.igBusinessId;
      await addAccount(cleaned);
    } catch (err: any) {
      setError(err?.message || "Failed to save Instagram account");
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  return { saveInstagramAccount, isLoading, error };
}
