import * as SecureStore from "expo-secure-store";
import * as LocalAuthentication from "expo-local-authentication";

// ---------- KEY HELPERS ----------

const accessTokenKey = () => `asoose_rider_access_token`;
const refreshTokenKey = () => `asoose_rider_refresh_token`;
const biometricEnabledKey = () => `asoose_rider_biometric_enabled`;
const biometricCredentialsKey = () => `asoose_rider_biometric_credentials`;

// ---------- BIOMETRIC HELPERS ----------

export async function isBiometricSupported(): Promise<boolean> {
  const compatible = await LocalAuthentication.hasHardwareAsync();
  return compatible;
}

export async function isBiometricEnrolled(): Promise<boolean> {
  const enrolled = await LocalAuthentication.isEnrolledAsync();
  return enrolled;
}

export async function authenticateWithBiometric(): Promise<boolean> {
  try {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: "Authenticate to access your account",
      fallbackLabel: "Use passcode",
      cancelLabel: "Cancel",
    });
    return result.success;
  } catch (error) {
    console.error("Biometric authentication error:", error);
    return false;
  }
}

export async function enableBiometric(identifier: string, password: string) {
  await SecureStore.setItemAsync(biometricEnabledKey(), "true", {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });

  // Store credentials securely for biometric login
  await SecureStore.setItemAsync(
    biometricCredentialsKey(),
    JSON.stringify({ identifier, password }),
    {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    },
  );
}

export async function disableBiometric() {
  await SecureStore.deleteItemAsync(biometricEnabledKey());
  await SecureStore.deleteItemAsync(biometricCredentialsKey());
}

export async function isBiometricEnabled(): Promise<boolean> {
  const enabled = await SecureStore.getItemAsync(biometricEnabledKey());
  return enabled === "true";
}

export async function getBiometricCredentials(): Promise<{
  identifier: string;
  password: string;
} | null> {
  const credentials = await SecureStore.getItemAsync(biometricCredentialsKey());
  if (!credentials) return null;
  return JSON.parse(credentials);
}

// ---------- LOGIN ----------

export async function login(identifier: string, password: string) {
  try {
    const res = await fetch(
      `${process.env.EXPO_PUBLIC_API_URL}/auth/rider/login`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "ngrok-skip-browser-warning": "true",
        },
        body: JSON.stringify({ email: identifier, password }),
      },
    );

    if (!res.ok) {
      const error = await res.json().catch(() => ({}));
      throw new Error(error.message || "Invalid credentials");
    }

    const { accessToken, refreshToken, user } = await res.json();

    await SecureStore.setItemAsync(accessTokenKey(), accessToken, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });

    await SecureStore.setItemAsync(refreshTokenKey(), refreshToken, {
      keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
    });

    return { user: user };
  } catch (error) {
    console.error("Login error:", error);
    throw error;
  }
}

// ---------- TOKEN HELPERS ----------

export async function getAccessToken() {
  return await SecureStore.getItemAsync(accessTokenKey());
}

export async function getRefreshToken() {
  return await SecureStore.getItemAsync(refreshTokenKey());
}

// ---------- REFRESH TOKEN ----------

export async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/rider/refresh`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "ngrok-skip-browser-warning": "true",
      },
      body: JSON.stringify({ refreshToken }),
    },
  );

  if (!res.ok) {
    throw new Error("Failed to refresh token");
  }

  const { accessToken } = await res.json();

  await SecureStore.setItemAsync(accessTokenKey(), accessToken, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });

  return accessToken;
}

// ---------- LOGOUT ----------

export async function logout() {
  await SecureStore.deleteItemAsync(accessTokenKey());
  await SecureStore.deleteItemAsync(refreshTokenKey());
  // Note: We keep biometric settings intact so user doesn't have to re-enable
}
