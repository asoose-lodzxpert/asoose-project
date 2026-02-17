import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
} from "@/constants/static-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { Platform } from "react-native";

const API_BASE = (() => {
  const url = process.env.EXPO_PUBLIC_API_URL;
  if (!url) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "EXPO_PUBLIC_API_URL is required in production. Please set it via EAS secrets or environment variables.",
      );
    }
    console.warn(
      "EXPO_PUBLIC_API_URL is not set. Using default development URL.",
    );
    return "https://asoose.com/api/v1";
  }
  return url.replace(/\/+$/, "").replace(/\/$/, "");
})();

const AUTH_BASE = `${API_BASE}/auth/user`;

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

/**
 * Helper to store tokens in AsyncStorage
 */
async function storeTokens(access: string, refresh: string) {
  await Promise.all([
    AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, access),
    AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, refresh),
  ]);
}

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

export async function initializeGoogleSignIn() {
  try {
    if (!GOOGLE_CLIENT_ID_WEB) {
      throw new Error("EXPO_PUBLIC_GOOGLE_CLIENT_ID_WEB is not configured");
    }

    GoogleSignin.configure({
      webClientId: GOOGLE_CLIENT_ID_WEB,
      iosClientId: process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID_IOS || undefined,
      offlineAccess: true,
      forceCodeForRefreshToken: true,
      scopes: ["profile", "email"],
    });
  } catch (error) {
    if (__DEV__) console.error("Google SignIn initialization error:", error);
    throw error;
  }
}

/**
 * Checks if the device supports Google Play Services
 */
export async function isGoogleSignInAvailable(): Promise<boolean> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: false });
    return true;
  } catch {
    return false;
  }
}

/**
 * Handle Google OAuth authentication
 * Updated for v13+ (data wrapper)
 */
export async function authenticateWithGoogle(): Promise<OAuthResponse> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });

    // New API returns an object with a 'data' property
    const { data } = await GoogleSignin.signIn();

    if (!data || !data.user.email) {
      throw new Error("Failed to retrieve user data from Google");
    }

    const response = await httpRequest({
      path: "oauth/google",
      body: {
        email: data.user.email,
        googleId: data.user.id,
        firstName: data.user.givenName || "",
        lastName: data.user.familyName || "",
        profilePicture: data.user.photo,
        idToken: data.idToken,
      },
    });

    await storeTokens(response.access_token, response.refresh_token);
    return response;
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("Google Sign-In was cancelled");
    } else if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error("Google Sign-In is already in progress");
    } else if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services not available");
    }
    if (__DEV__) console.error("Google OAuth error:", error);
    throw new Error(error.message || "Google sign-in failed");
  }
}

export async function signOutGoogle(): Promise<void> {
  try {
    await GoogleSignin.signOut();
  } catch (error) {
    if (__DEV__) console.error("Google sign-out error:", error);
  }
}

/**
 * Replaces old .isSignedIn()
 */
export async function isGoogleSignedIn(): Promise<boolean> {
  try {
    return await GoogleSignin.hasPreviousSignIn();
  } catch {
    return false;
  }
}

export async function isAppleSignInAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

export async function authenticateWithApple(): Promise<OAuthResponse> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    const response = await httpRequest({
      path: "oauth/apple",
      body: {
        email:
          credential.email || `${credential.user}@privaterelay.appleid.com`,
        appleId: credential.user,
        identityToken: credential.identityToken, // Safer for backend verification
        firstName: credential.fullName?.givenName || "",
        lastName: credential.fullName?.familyName || "",
      },
    });

    await storeTokens(response.access_token, response.refresh_token);
    return response;
  } catch (error: any) {
    if (error.code === "ERR_REQUEST_CANCELED") {
      throw new Error("Apple Sign-In was cancelled");
    }
    if (__DEV__) console.error("Apple OAuth error:", error);
    throw new Error("Apple Sign-In failed");
  }
}
