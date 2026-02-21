// ─── AsyncStorage keys ──────────────────────────────────────────────────────
export const AUTH_USER_KEY = "auth_user";
export const AUTH_ACCESS_TOKEN_KEY = "asoose_access_token";
export const AUTH_REFRESH_TOKEN_KEY = "asoose_refresh_token";

// ─── Environment: API ────────────────────────────────────────────────────────
const _rawApiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!_rawApiUrl) {
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "EXPO_PUBLIC_API_URL is required in production. Set it via EAS secrets or environment variables.",
    );
  }
  console.warn(
    "[config] EXPO_PUBLIC_API_URL is not set. Falling back to https://asoose.com/api/v1",
  );
}

/** Base URL of the NestJS API, e.g. https://api.asoose.com/api/v1 */
export const API_BASE: string = (
  _rawApiUrl ?? "https://asoose.com/api/v1"
).replace(/\/+$/, "");

/** Shorthand auth paths */
export const AUTH_BASE = `${API_BASE}/auth/user`;
export const UNIVERSAL_AUTH_BASE = `${API_BASE}/auth`;

// ─── Environment: Google OAuth ───────────────────────────────────────────────
/** Web client ID used by @react-native-google-signin/google-signin */
export const GOOGLE_WEB_CLIENT_ID: string =
  process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ?? "";

/** iOS client ID for @react-native-google-signin/google-signin (optional — improves iOS UX) */
export const GOOGLE_CLIENT_ID_IOS: string | undefined =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || undefined;

// ─── Environment: Google Maps ────────────────────────────────────────────────
export const GOOGLE_MAPS_API_KEY: string | undefined =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || undefined;

// ─── Onboarding keys ─────────────────────────────────────────────────────────
export const ONBOARDING_KEY = "asoose_customer_onboarded";
export const LOCATION_DISCLOSURE_KEY = "locationDisclosureSeen";
