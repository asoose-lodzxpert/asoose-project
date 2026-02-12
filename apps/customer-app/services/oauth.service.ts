import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
} from "@/constants/static-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import * as Google from "expo-auth-session/providers/google";
import { Platform } from "react-native";

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

// Google OAuth Configuration
const GOOGLE_CLIENT_ID_IOS = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || "";
const GOOGLE_CLIENT_ID_ANDROID =
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_ANDROID || "";
const GOOGLE_CLIENT_ID_WEB = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB || "";

type OAuthResponse = {
  user: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    role: string;
    profilePicture?: string;
  };
  access_token: string;
  refresh_token: string;
};

async function httpRequest({
  path,
  method = "POST",
  body,
}: {
  path: string;
  method?: string;
  body: any;
}) {
  const url = `${AUTH_BASE}/${path}`;
  const response = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      "ngrok-skip-browser-warning": "true",
    },
    body: JSON.stringify(body),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.message || "OAuth authentication failed");
  }
  return data;
}

/**
 * Initialize Google Sign-In
 * Returns a request object and promptAsync function
 */
export function useGoogleSignIn() {
  const [request, response, promptAsync] = Google.useAuthRequest({
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    androidClientId: GOOGLE_CLIENT_ID_ANDROID,
    webClientId: GOOGLE_CLIENT_ID_WEB,
  });

  return { request, response, promptAsync };
}

/**
 * Handle Google OAuth authentication with backend
 */
export async function authenticateWithGoogle(
  accessToken: string,
): Promise<OAuthResponse> {
  try {
    // Fetch user info from Google
    const userInfoResponse = await fetch(
      "https://www.googleapis.com/userinfo/v2/me",
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!userInfoResponse.ok) {
      throw new Error("Failed to fetch Google user info");
    }

    const googleUser = await userInfoResponse.json();

    // Send to backend
    const response = await httpRequest({
      path: "oauth/google",
      body: {
        email: googleUser.email,
        googleId: googleUser.id,
        firstName: googleUser.given_name,
        lastName: googleUser.family_name,
        profilePicture: googleUser.picture,
      },
    });

    // Store tokens
    await AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, response.access_token);
    await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, response.refresh_token);

    return response;
  } catch (error) {
    if (__DEV__) console.error("Google OAuth error:", error);
    throw error;
  }
}

/**
 * Check if Apple Sign-In is available
 */
export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Handle Apple Sign-In authentication with backend
 */
export async function authenticateWithApple(): Promise<OAuthResponse> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    // Send to backend
    const response = await httpRequest({
      path: "oauth/apple",
      body: {
        email:
          credential.email || `${credential.user}@privaterelay.appleid.com`,
        appleId: credential.user,
        firstName: credential.fullName?.givenName || "",
        lastName: credential.fullName?.familyName || "",
      },
    });

    // Store tokens
    await AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, response.access_token);
    await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, response.refresh_token);

    return response;
  } catch (error: any) {
    if (error.code === "ERR_CANCELED") {
      throw new Error("Apple Sign-In was cancelled");
    }
    if (__DEV__) console.error("Apple OAuth error:", error);
    throw new Error("Apple Sign-In failed");
  }
}
