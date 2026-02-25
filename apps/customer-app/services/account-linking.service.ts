/**
 * Account Linking Service
 *
 * Functions to link / unlink Google and Apple OAuth providers to an
 * already-authenticated customer account.  Unlike the oauth.service.ts
 * login flows, these calls hit the authenticated endpoints
 * (Bearer token is automatically attached by authFetch).
 */

import * as AppleAuthentication from "expo-apple-authentication";
import { Platform } from "react-native";
import {
  GoogleSignin,
  statusCodes,
} from "@react-native-google-signin/google-signin";
import { request, get, post } from "@/lib/authFetch";

// Re-exported for convenience
export { configureGoogleSignIn } from "./oauth.service";

export type LinkedAccountsStatus = {
  google: boolean;
  apple: boolean;
};

/** Fetch which OAuth providers are currently linked to the current user. */
export async function getLinkedAccounts(): Promise<LinkedAccountsStatus> {
  return get("auth/user/linked-accounts") as Promise<LinkedAccountsStatus>;
}

// ─── Google ──────────────────────────────────────────────────────────────────

/**
 * Trigger native Google Sign-In and link the resulting credential to the
 * current user account.  Throws if the user cancels or if the googleId is
 * already linked to another account.
 */
export async function linkGoogleAccount(): Promise<{ message: string }> {
  try {
    await GoogleSignin.hasPlayServices({ showPlayServicesUpdateDialog: true });
    const userInfo = await GoogleSignin.signIn();
    const user = userInfo.data?.user;
    if (!user) throw new Error("Could not retrieve Google account info");

    return post("auth/user/link/google", {
      email: user.email,
      googleId: user.id,
      firstName: user.givenName ?? "",
      lastName: user.familyName ?? "",
      profilePicture: user.photo ?? undefined,
    });
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new Error("Google Sign-In was cancelled");
    }
    if (error.code === statusCodes.IN_PROGRESS) {
      throw new Error("Sign-In is already in progress");
    }
    if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
      throw new Error("Google Play Services not available");
    }
    throw error;
  }
}

/** Remove the Google link from the current user account. */
export async function unlinkGoogleAccount(): Promise<{ message: string }> {
  return request("auth/user/link/google", { method: "DELETE" });
}

// ─── Apple ───────────────────────────────────────────────────────────────────

/** Returns true only on iOS where Apple Sign-In is available. */
export async function isAppleAvailable(): Promise<boolean> {
  if (Platform.OS !== "ios") return false;
  try {
    return await AppleAuthentication.isAvailableAsync();
  } catch {
    return false;
  }
}

/**
 * Trigger native Apple Sign-In and link the resulting credential to the
 * current user account.  Only available on iOS.
 */
export async function linkAppleAccount(): Promise<{ message: string }> {
  try {
    const credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
    });

    return post("auth/user/link/apple", {
      email: credential.email || `${credential.user}@privaterelay.appleid.com`,
      appleId: credential.user,
      firstName: credential.fullName?.givenName ?? "",
      lastName: credential.fullName?.familyName ?? "",
    });
  } catch (error: any) {
    if (error.code === "ERR_CANCELED") {
      throw new Error("Apple Sign-In was cancelled");
    }
    throw error;
  }
}

/** Remove the Apple link from the current user account. */
export async function unlinkAppleAccount(): Promise<{ message: string }> {
  return request("auth/user/link/apple", { method: "DELETE" });
}
