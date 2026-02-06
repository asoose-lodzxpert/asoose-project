import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { RelativePathString, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import {
  useGoogleSignIn,
  authenticateWithGoogle,
  authenticateWithApple,
  isAppleSignInAvailable,
} from "@/services/oauth.service";

WebBrowser.maybeCompleteAuthSession();

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/components/ui/ThemedToast";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

/* ---------------------------------- */
/* Screen */
/* ---------------------------------- */
export default function LoginScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const {
    login,
    biometricLogin,
    biometricAvailable,
    biometricEnrolled,
    enableBiometrics,
    isBiometricEnabled,
  } = useAuth();
  const router = useRouter();
  const showToast = useToast();
  const showConfirm = useConfirm();

  // Form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Biometric state
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  // OAuth state
  const { request, response, promptAsync } = useGoogleSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Check if biometric is enabled for this user
  useEffect(() => {
    (async () => {
      try {
        const enabled = await isBiometricEnabled();
        setBiometricEnabled(enabled);
      } catch (err) {
        console.error("[LoginScreen] Failed to check biometric status:", err);
      }
    })();
  }, [isBiometricEnabled]);

  // Check Apple Sign-In availability
  useEffect(() => {
    (async () => {
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
    })();
  }, []);

  // Handle Google OAuth response
  useEffect(() => {
    if (response?.type === "success" && response.authentication) {
      handleGoogleSignIn(response.authentication.accessToken);
    }
  }, [response]);

  /* ---------------------------------- */
  /* Email/Password Login */
  /* ---------------------------------- */
  const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Please enter your email or phone and password");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login({ email: identifier, password });
      showToast({ message: "Login successful!", variant: "success" });

      // Ask user if they want to enable biometric login
      if (biometricAvailable && biometricEnrolled && !biometricEnabled) {
        showConfirm({
          title: "Enable Biometric Login?",
          message:
            "Save your credentials to login with your fingerprint next time",
          confirmLabel: "Enable",
          cancelLabel: "Skip",
        }).then(async (confirmed) => {
          if (confirmed) {
            try {
              await enableBiometrics(identifier, password);
              setBiometricEnabled(true);
              showToast({
                message: "Biometric login enabled",
                variant: "success",
              });
            } catch (err: any) {
              console.error("[LoginScreen] Failed to enable biometric:", err);
              showToast({
                message: "Failed to enable biometric",
                variant: "error",
              });
            }
          }
        });
      }

      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      setError(err.message || "Login failed");
      showToast({ message: err.message || "Login failed", variant: "error" });
    }
    setLoading(false);
  };

  /* ---------------------------------- */
  /* Google Sign-In */
  /* ---------------------------------- */
  const handleGoogleSignIn = async (accessToken: string) => {
    setOauthLoading(true);
    try {
      const response = await authenticateWithGoogle(accessToken);
      showToast({ message: "Login successful!", variant: "success" });
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      const errorMsg = err.message || "Google sign-in failed";
      console.error("[LoginScreen] Google sign-in error:", err);
      showToast({ message: errorMsg, variant: "error" });
    } finally {
      setOauthLoading(false);
    }
  };

  /* ---------------------------------- */
  /* Apple Sign-In */
  /* ---------------------------------- */
  const handleAppleSignIn = async () => {
    setOauthLoading(true);
    try {
      const response = await authenticateWithApple();
      showToast({ message: "Login successful!", variant: "success" });
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      if (err.message !== "Apple Sign-In was cancelled") {
        const errorMsg = err.message || "Apple sign-in failed";
        console.error("[LoginScreen] Apple sign-in error:", err);
        showToast({ message: errorMsg, variant: "error" });
      }
    } finally {
      setOauthLoading(false);
    }
  };

  /* ---------------------------------- */
  /* Biometric Login */
  /* ---------------------------------- */
  const handleBiometricLogin = async () => {
    if (!biometricAvailable || !biometricEnrolled) {
      showToast({
        message: "Biometric authentication not available",
        variant: "info",
      });
      return;
    }

    if (!biometricEnabled) {
      showToast({
        message: "Please login first to enable biometric",
        variant: "info",
      });
      return;
    }

    setBiometricLoading(true);
    try {
      // CRITICAL: biometricLogin blocks until verification completes
      await biometricLogin();
      showToast({ message: "Login successful!", variant: "success" });
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      const errorMsg = err.message || "Biometric login failed";
      console.error("[LoginScreen] Biometric login error:", err);
      showToast({ message: errorMsg, variant: "error" });
    }
    setBiometricLoading(false);
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Welcome Back
          </ThemedText>
          <ThemedText style={{ color: textMuted, textAlign: "center" }}>
            Sign in to continue
          </ThemedText>
        </View>

        {/* Login Card */}
        <View style={[styles.card, { borderColor: border }]}>
          <ThemedInput
            placeholder="Email or phone number"
            value={identifier}
            onChangeText={(v) => {
              setIdentifier(v);
              if (error) setError(null);
            }}
            autoCapitalize="none"
            keyboardType="email-address"
            editable={!loading}
          />

          <ThemedInput
            placeholder="Password"
            value={password}
            onChangeText={(v) => {
              setPassword(v);
              if (error) setError(null);
            }}
            secureTextEntry={secure}
            editable={!loading}
            iconRight={
              <Pressable onPress={() => setSecure((s) => !s)}>
                <IconSymbol
                  name={secure ? "eye.slash.fill" : "eye.fill"}
                  size={18}
                  color={textMuted}
                />
              </Pressable>
            }
          />

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <Pressable
            style={styles.forgot}
            disabled={loading}
            onPress={() =>
              router.push("/(auth)/forgot-password/" as RelativePathString)
            }
          >
            <ThemedText style={{ color: primary, fontWeight: "600" }}>
              Forgot password?
            </ThemedText>
          </Pressable>

          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>Sign In</ThemedText>
            )}
          </Pressable>

          {biometricEnabled && (
            <Pressable
              style={styles.biometricButton}
              disabled={loading}
              onPress={handleLogin}
            >
              <IconSymbol name="touchid" size={20} color={primary} />
              <ThemedText style={{ color: primary, fontWeight: "600" }}>
                Use Biometrics
              </ThemedText>
            </Pressable>
          )}
        </View>

        {/* Social Login */}
        <View style={styles.socialSection}>
          <ThemedText style={{ color: textMuted }}>Or continue with</ThemedText>

          <View style={styles.socialRow}>
            {/* Google Sign-In */}
            <Pressable
              style={[
                styles.socialButton,
                { borderColor: border, opacity: oauthLoading ? 0.6 : 1 },
              ]}
              onPress={() => promptAsync()}
              disabled={!request || loading || oauthLoading}
            >
              {oauthLoading ? (
                <ActivityIndicator size="small" color={primary} />
              ) : (
                <>
                  <IconSymbol name="google.logo" size={18} color={primary} />
                  <ThemedText>Google</ThemedText>
                </>
              )}
            </Pressable>

            {/* Apple Sign-In (iOS only) */}
            {appleAvailable && (
              <Pressable
                style={[
                  styles.socialButton,
                  { borderColor: border, opacity: oauthLoading ? 0.6 : 1 },
                ]}
                onPress={handleAppleSignIn}
                disabled={loading || oauthLoading}
              >
                <IconSymbol name="apple.logo" size={18} color={primary} />
                <ThemedText>Apple</ThemedText>
              </Pressable>
            )}
          </View>
        </View>

        {/* Sign Up */}
        <View style={styles.signupSection}>
          <ThemedText style={{ color: textMuted }}>
            Don’t have an account?
          </ThemedText>

          <Pressable
            onPress={() => router.push("/(auth)/signup")}
            disabled={loading}
          >
            <ThemedText style={{ color: primary, fontWeight: "700" }}>
              Create account
            </ThemedText>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

/* ---------------------------------- */
/* Styles */
/* ---------------------------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
  },
  header: {
    alignItems: "center",
    marginTop: 80,
    marginBottom: 40,
    gap: 8,
  },
  logo: {
    width: 72,
    height: 72,
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    textAlign: "center",
  },
  card: {
    gap: 14,
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
  forgot: {
    alignSelf: "flex-end",
    marginBottom: 6,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  biometricButton: {
    marginTop: 12,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  socialSection: {
    marginTop: 32,
    alignItems: "center",
    gap: 14,
  },
  socialRow: {
    flexDirection: "row",
    gap: 12,
  },
  socialButton: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 18,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  signupSection: {
    marginTop: 28,
    alignItems: "center",
    gap: 6,
  },
});
