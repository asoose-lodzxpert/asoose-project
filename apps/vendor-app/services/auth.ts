import * as SecureStore from "expo-secure-store";

// ---------- KEY HELPERS (scoped by vendor identifier) ----------

const accessTokenKey = () => `@asoose_vendor_access_token`;

const refreshTokenKey = () => `@asoose_vendor_refresh_token`;

// ---------------- LOGIN ----------------

export async function login(identifier: string, password: string) {
  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/login`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identifier, password }),
    }
  );

  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || "Invalid credentials");
  }

  const { accessToken, refreshToken, vendor } = await res.json();

  // assuming vendor.id or vendor.identifier exists
  const vendorKey = vendor.id || vendor.identifier || identifier;

  await SecureStore.setItemAsync(accessTokenKey(), accessToken, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });

  await SecureStore.setItemAsync(refreshTokenKey(), refreshToken, {
    keychainAccessible: SecureStore.AFTER_FIRST_UNLOCK_THIS_DEVICE_ONLY,
  });

  return { user: vendor, vendorKey };
}

// ---------------- TOKEN HELPERS ----------------

export async function getAccessToken() {
  return await SecureStore.getItemAsync(accessTokenKey());
}

export async function getRefreshToken() {
  return await SecureStore.getItemAsync(refreshTokenKey());
}

// ---------------- REFRESH TOKEN ----------------

export async function refreshAccessToken() {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token");

  const res = await fetch(
    `${process.env.EXPO_PUBLIC_API_URL}/auth/vendor/refresh`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refreshToken }),
    }
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

// ---------------- LOGOUT ----------------

export async function logout() {
  await SecureStore.deleteItemAsync(accessTokenKey());
  await SecureStore.deleteItemAsync(refreshTokenKey());
}
