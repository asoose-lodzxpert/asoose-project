import { useState, useCallback } from "react";
import * as LocalAuthentication from "expo-local-authentication";
import * as SecureStore from "expo-secure-store";

const BIOMETRIC_CREDENTIALS_KEY = "rider_biometric_credentials";

export type BiometricStatus = "idle" | "verifying" | "success" | "error";

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export function useBiometric() {
  const [isAvailable, setIsAvailable] = useState(false);
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [status, setStatus] = useState<BiometricStatus>("idle");
  const [error, setError] = useState<string | null>(null);

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
      setIsAvailable(false);
      setIsEnrolled(false);
      return { available: false, enrolled: false };
    }
  }, []);

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
        setStatus("success");
        setError(null);
        return { success: true };
      } catch (err: any) {
        const errorMsg = err.message || "Biometric authentication failed";
        setError(errorMsg);
        setStatus("error");
        return { success: false, error: errorMsg };
      }
    },
    [isAvailable, isEnrolled],
  );

  const saveCredentials = useCallback(
    async (email: string, password: string): Promise<boolean> => {
      try {
        if (!isAvailable || !isEnrolled) {
          return false;
        }
        await SecureStore.setItemAsync(
          BIOMETRIC_CREDENTIALS_KEY,
          JSON.stringify({ email, password }),
          { keychainAccessible: SecureStore.ALWAYS_THIS_DEVICE_ONLY },
        );
        return true;
      } catch (err) {
        return false;
      }
    },
    [isAvailable, isEnrolled],
  );

  const getCredentials = useCallback(async (): Promise<{
    email: string;
    password: string;
  } | null> => {
    try {
      const stored = await SecureStore.getItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch (err) {
      return null;
    }
  }, []);

  const clearCredentials = useCallback(async (): Promise<boolean> => {
    try {
      await SecureStore.deleteItemAsync(BIOMETRIC_CREDENTIALS_KEY);
      return true;
    } catch (err) {
      return false;
    }
  }, []);

  const resetStatus = useCallback(() => {
    setStatus("idle");
    setError(null);
  }, []);

  return {
    isAvailable,
    isEnrolled,
    status,
    error,
    checkBiometricAvailability,
    authenticate,
    saveCredentials,
    getCredentials,
    clearCredentials,
    resetStatus,
  };
}
