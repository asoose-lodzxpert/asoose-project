import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  API_BASE,
  AUTH_BASE,
  UNIVERSAL_AUTH_BASE,
} from "@/constants/static-config";
import AsyncStorage from "@react-native-async-storage/async-storage";

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

  // Remove token saving from here, only return values
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

  // Support both camelCase and snake_case from backend
  const accessToken = data?.accessToken || data?.access_token;
  const newRefreshToken = data?.refreshToken || data?.refresh_token;

  if (!accessToken) throw new Error("Failed to refresh session");

  await setTokens({
    accessToken,
    refreshToken: newRefreshToken || refreshToken,
  });

  return accessToken;
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
  // Invalidate the refresh token on the backend (fire-and-forget — never blocks local logout)
  try {
    const rToken = await getRefreshToken();
    if (rToken) {
      await fetch(`${API_BASE}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken: rToken }),
      });
    }
  } catch {
    // Non-fatal — proceed to clear local tokens regardless
  }
  await clearTokens();
}

export async function getAccessToken() {
  return AsyncStorage.getItem(AUTH_ACCESS_TOKEN_KEY);
}

export async function getRefreshToken() {
  return AsyncStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
}

export async function setTokens(tokens: {
  accessToken?: string | null;
  refreshToken?: string | null;
}) {
  const ops: Promise<void>[] = [];
  if (typeof tokens.accessToken === "string") {
    ops.push(AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, tokens.accessToken));
  } else if (tokens.accessToken === null) {
    ops.push(AsyncStorage.removeItem(AUTH_ACCESS_TOKEN_KEY));
  }

  if (typeof tokens.refreshToken === "string") {
    ops.push(AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, tokens.refreshToken));
  } else if (tokens.refreshToken === null) {
    ops.push(AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY));
  }

  await Promise.all(ops);
}

export async function clearTokens() {
  await Promise.all([
    AsyncStorage.removeItem(AUTH_ACCESS_TOKEN_KEY),
    AsyncStorage.removeItem(AUTH_REFRESH_TOKEN_KEY),
  ]);
}

export const authConfig = {
  apiBase: API_BASE,
  authBase: AUTH_BASE,
  accessTokenKey: AUTH_ACCESS_TOKEN_KEY,
  refreshTokenKey: AUTH_REFRESH_TOKEN_KEY,
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
