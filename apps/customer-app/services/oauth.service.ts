import {
  AUTH_ACCESS_TOKEN_KEY,
  AUTH_REFRESH_TOKEN_KEY,
  AUTH_BASE,
  GOOGLE_WEB_CLIENT_ID,
  GOOGLE_CLIENT_ID_IOS,
} from "@/constants/static-config";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";

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
 * Configure native Google Sign-In. Call once on app mount (idempotent).
 */
export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: GOOGLE_WEB_CLIENT_ID,
    iosClientId: GOOGLE_CLIENT_ID_IOS,
    scopes: ["profile", "email"],
  });
}

/**
 * Trigger native Google Sign-In and authenticate with backend.
 */
export async function signInWithGoogle(): Promise<OAuthResponse> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const result = await GoogleSignin.signIn();
    if (__DEV__) console.log("[GoogleSignIn] Result:", JSON.stringify(result, null, 2));

    if (result.type === "cancelled") {
      throw new Error("Google Sign-In was cancelled");
    }

    const { user } = result.data;

    const response = await httpRequest({
      path: "oauth/google",
      body: {
        email: user.email,
        googleId: user.id,
        firstName: user.givenName || "",
        lastName: user.familyName || "",
        profilePicture: user.photo || undefined,
      },
    });

    await AsyncStorage.setItem(AUTH_ACCESS_TOKEN_KEY, response.access_token);
    await AsyncStorage.setItem(AUTH_REFRESH_TOKEN_KEY, response.refresh_token);

    return response;
  } catch (error: any) {
    if (__DEV__) console.error("[GoogleSignIn] Detailed Error:", error);
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("Google Sign-In was cancelled");
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error("Sign-In is already in progress");
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services not available");
    }
    if (__DEV__) console.error("Google Sign-In error:", error);
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
