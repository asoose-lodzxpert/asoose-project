import * as SecureStore from "expo-secure-store";

const API_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "EXPO_PUBLIC_API_URL is required in production. Please set it via EAS secrets or environment variables.",
      );
    }
    // In development, you may fallback or warn
    console.warn(
      "EXPO_PUBLIC_API_URL is not set. Using default development URL.",
    );
    return "https://asoose.com/api/v1";
  }
  return url.replace(/\/+$/, "").replace(/\/$/, "");
})();
const AUTH_BASE = `${API_BASE}/auth/user`;
const UNIVERSAL_AUTH_BASE = `${API_BASE}/auth`;

const ACCESS_TOKEN_KEY = "@auth/access_token";
const REFRESH_TOKEN_KEY = "@auth/refresh_token";

type SignupPayload = {
  name: string;
  email: string;
  phone: string;
  password: string;
};

type LoginResponse<UserShape = any> = {
  user: UserShape;
  accessToken: string;
  refreshToken: string;
};

type ResetPasswordPayload = {
  email: string;
  token: string;
  newPassword: string;
};

type HttpRequestOptions = {
  path: string;
  method?: string;
  body?: unknown;
  baseUrl?: string;
  headers?: Record<string, string>;
};

function buildUrl(baseUrl: string, path: string) {
  const normalizedBase = baseUrl.replace(/\/+$/, "");
  const normalizedPath = path.replace(/^\/+/, "");
  return `${normalizedBase}/${normalizedPath}`;
}

async function parseBody(res: Response) {
  const text = await res.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function toError(body: any, statusText: string) {
  if (!body) return new Error(statusText || "Request failed");
  if (typeof body === "string") return new Error(body);
  if (typeof body.message === "string") return new Error(body.message);
  if (typeof body.error === "string") return new Error(body.error);
  return new Error(statusText || "Request failed");
}

async function httpRequest({
  path,
  method = "GET",
  body,
  baseUrl = AUTH_BASE,
  headers = {},
}: HttpRequestOptions) {
  const url = buildUrl(baseUrl, path);
  const payload =
    body === undefined || body === null
      ? undefined
      : typeof body === "string"
        ? body
        : JSON.stringify(body);

  const composedHeaders: Record<string, string> = {
    "Content-Type": "application/json",
    "ngrok-skip-browser-warning": "true",
    ...headers,
  };

  const response = await fetch(url, {
    method,
    headers: composedHeaders,
    body: payload,
  });

  const parsed = await parseBody(response);
  if (!response.ok) throw toError(parsed, response.statusText);
  return parsed;
}

export async function signup(payload: SignupPayload) {
  return httpRequest({ path: "register", method: "POST", body: payload });
}

export async function requestPasswordReset(email: string) {
  return httpRequest({
    path: "forgot-password",
    method: "POST",
    body: { email },
  });
}

export async function login<UserShape = any>(
  email: string,
  password: string,
): Promise<LoginResponse<UserShape>> {
  const data = await httpRequest({
    path: "login",
    method: "POST",
    body: { email, password },
  });

  // Accept both snake_case and camelCase from backend
  const accessToken = data.accessToken || data.access_token;
  const refreshToken = data.refreshToken || data.refresh_token;

  if (!accessToken || !refreshToken) {
    throw new Error("Login response missing tokens");
  }

  await setTokens({
    accessToken,
    refreshToken,
  });

  // Always return camelCase for frontend
  return {
    ...data,
    accessToken,
    refreshToken,
  } as LoginResponse<UserShape>;
}

export async function refreshAccessToken(): Promise<string> {
  const refreshToken = await getRefreshToken();
  if (!refreshToken) throw new Error("No refresh token available");

  const data = await httpRequest({
    path: "refresh",
    method: "POST",
    body: { refreshToken },
    baseUrl: UNIVERSAL_AUTH_BASE,
  });

  if (!data?.accessToken) throw new Error("Failed to refresh session");

  await setTokens({
    accessToken: data.accessToken,
    refreshToken: data.refreshToken || refreshToken,
  });

  return data.accessToken;
}

export async function refreshToken() {
  return refreshAccessToken();
}

export async function resetPasswordWithOtp(payload: ResetPasswordPayload) {
  return httpRequest({
    path: "reset-password",
    method: "POST",
    body: {
      email: payload.email,
      newPassword: payload.newPassword,
      token: payload.token,
    },
  });
}

export async function logout() {
  await clearTokens();
}

export async function getAccessToken() {
  return SecureStore.getItemAsync(ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return SecureStore.getItemAsync(REFRESH_TOKEN_KEY);
}

export async function setTokens(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  const ops: Promise<void>[] = [];
  if (typeof tokens.accessToken === "string") {
    ops.push(SecureStore.setItemAsync(ACCESS_TOKEN_KEY, tokens.accessToken));
  } else if (tokens.accessToken === null) {
    ops.push(SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY));
  }

  if (typeof tokens.refreshToken === "string") {
    ops.push(SecureStore.setItemAsync(REFRESH_TOKEN_KEY, tokens.refreshToken));
  } else if (tokens.refreshToken === null) {
    ops.push(SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY));
  }

  await Promise.all(ops);
}

export async function clearTokens() {
  await Promise.all([
    SecureStore.deleteItemAsync(ACCESS_TOKEN_KEY),
    SecureStore.deleteItemAsync(REFRESH_TOKEN_KEY),
  ]);
}

export const authConfig = {
  apiBase: API_BASE,
  authBase: AUTH_BASE,
  accessTokenKey: ACCESS_TOKEN_KEY,
  refreshTokenKey: REFRESH_TOKEN_KEY,
};

export default {
  signup,
  login,
  refreshAccessToken,
  logout,
  authConfig,
  requestPasswordReset,
  resetPasswordWithOtp,
};
