import { useState, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_CREDENTIALS_KEY = "@auth/biometric_credentials";

export type BiometricStatus = "idle" | "verifying" | "success" | "error";

export interface BiometricResult {
  success: boolean;
  error?: string;
}

/**
 * Hook for managing biometric authentication (fingerprint, Face ID, etc.)
 *
 * CRITICAL: This hook enforces blocking logic - biometric verification MUST complete
 * before any login operations proceed. No early returns or bypasses allowed.
 */
export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [status, setStatus] = useState<BiometricStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  /**
   * Check device biometric capabilities
   * Runs once to determine if device supports and has enrolled biometrics
   */
  const checkBiometricAvailability = useCallback(async () => {
    try {
      const compatible = await LocalAuthentication.hasHardwareAsync();
      setIsAvailable(compatible);

      if (!compatible) {
        return { available: false, enrolled: false };
      }

      const enrolled = await LocalAuthentication.isEnrolledAsync();
      setIsEnrolled(enrolled);

      return { available: compatible, enrolled };
    } catch (err) {
      console.error("[useBiometric] Availability check failed:", err);
      setIsAvailable(false);
      setIsEnrolled(false);
      return { available: false, enrolled: false };
    }
  }, []);

  /**
   * Perform biometric authentication
   * BLOCKING: Returns success/failure - caller must check result before proceeding
   */
  const authenticate = useCallback(
    async (
      promptMessage: string = "Verify your identity",
    ): Promise<BiometricResult> => {
      if (!isAvailable || !isEnrolled) {
        const msg = "Biometric authentication not available on this device";
        setError(msg);
        return { success: false, error: msg };
      }

      setStatus("verifying");
      setError(null);

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage,
          fallbackLabel: "Use passcode",
          disableDeviceFallback: false,
        });

        // CRITICAL: Check result.success explicitly - this is the verification gate
        if (!result.success) {
          const errorMsg =
            result.error === "user_cancel"
              ? "Biometric verification cancelled"
              : result.error === "system_cancel"
                ? "Biometric verification cancelled by system"
                : "Biometric verification failed";

          setError(errorMsg);
          setStatus("error");
          return { success: false, error: errorMsg };
        }

        // Verification succeeded - only then mark as success
        setStatus("success");
        setError(null);
        return { success: true };
      } catch (err: any) {
        const errorMsg = err.message || "Biometric authentication failed";
        console.error("[useBiometric] Authentication error:", err);
        setError(errorMsg);
        setStatus("error");
        return { success: false, error: errorMsg };
      }
    },
    [isAvailable, isEnrolled],
  );

  /**
   * Save credentials for biometric login
   * MUST be called AFTER successful login, not before
   */
  const saveCredentials = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        if (!isAvailable || !isEnrolled) {
          console.warn(
            "[useBiometric] Cannot save credentials - biometric unavailable",
          );
          return false;
        }
        await SecureStore.setItemAsync(
          BIOMETRIC_CREDENTIALS_KEY,
          JSON.stringify({ email, password }),
          { keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY },
        );
        return true;
      } catch (err) {
        console.error("[useBiometric] Failed to save credentials:", err);
        return false;
      }
    },
    [isAvailable, isEnrolled],
  );

  /**
   * Get saved credentials for biometric login
   */
  const getCredentials = useCallback(async (): Promise<{
    email: string;
    password: string;
  } | null> => {
    try {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      console.error("[useBiometric] Failed to retrieve credentials:", err);
      return null;
    }
  }, []);

  /**
   * Clear saved biometric credentials
   * Call this when user logs out
   */
  const clearCredentials = useCallback(async (): Promise<boolean> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      return true;
    } catch (err) {
      console.error("[useBiometric] Failed to clear credentials:", err);
      return false;
    }
  }, []);

  /**
   * Reset biometric status (call after login succeeds or fails)
   */
  const resetStatus = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    // State
    isAvailable,
    isEnrolled,
    status,
    error,

    // Methods
    checkBiometricAvailability,
    authenticate,
    saveCredentials,
    getCredentials,
    clearCredentials,
    resetStatus,
  };
}
