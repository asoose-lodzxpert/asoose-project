import React, { useState, useEffect } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
} from "react-native";
import { RelativePathString, useRouter } from "expo-router";
import * as WebBrowser from "expo-web-browser";
import Toast from "react-native-toast-message"; // Corrected import
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
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";

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
  const showConfirm = useConfirm();

  // Form state
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Biometric/OAuth state
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const { request, response, promptAsync } = useGoogleSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);

  // Initial check for biometrics and Apple availability
  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);

      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);

      // Automatic biometric prompt on mount
      if (enabled && biometricAvailable && biometricEnrolled) {
        // Short timeout to ensure UI is ready
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    })();
  }, []);

  useEffect(() => {
    if (response?.type === "success" && response.authentication) {
      handleGoogleSignIn(response.authentication.accessToken);
    }
  }, [response]);

  const handleLogin = async () => {
    if (!identifier || !password) {
      setError("Please enter your credentials");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      await login({ email: identifier, password });

      if (biometricAvailable && biometricEnrolled && !biometricEnabled) {
        const confirmed = await showConfirm({
          title: "Enable Biometric Login?",
          message: "Use your fingerprint to login next time",
          confirmLabel: "Enable",
          cancelLabel: "Skip",
        });

        if (confirmed) {
          await enableBiometrics(identifier, password);
          setBiometricEnabled(true);
        }
      }
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      setError(err.message || "Login failed");
      Toast.show({ type: "error", text1: err.message || "Login failed" });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async (token: string) => {
    setOauthLoading(true);
    try {
      await authenticateWithGoogle(token);
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      Toast.show({
        type: "error",
        text1: "Google Login Error",
        text2: err.message || "Google sign-in failed",
      });
    } finally {
      setOauthLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setOauthLoading(true);
    try {
      await authenticateWithApple();
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      if (err.message !== "Apple Sign-In was cancelled") {
        Toast.show({
          type: "error",
          text1: "Apple Login Error",
          text2: err.message || "Apple sign-in failed",
        });
      }
    } finally {
      setOauthLoading(false);
    }
  };

  const handleBiometricLogin = async () => {
    try {
      await biometricLogin();
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      // If user cancels biometric, we don't necessarily want an intrusive error
      // unless it's an actual hardware failure.
      console.log("Biometric login failed or cancelled");
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Header */}
          <View style={styles.headerSection}>
            <ThemedText type="title" style={styles.title}>
              Welcome Back
            </ThemedText>
            <ThemedText style={{ color: textMuted }}>
              Sign in to continue
            </ThemedText>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <ThemedInput
              placeholder="Email or phone number"
              value={identifier}
              onChangeText={(v) => {
                setIdentifier(v);
                setError(null);
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
                setError(null);
              }}
              secureTextEntry={secure}
              editable={!loading}
              iconRight={
                <Pressable onPress={() => setSecure(!secure)}>
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
              style={styles.forgotBtn}
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
                <ThemedText style={styles.buttonText}>Sign In</ThemedText>
              )}
            </Pressable>

            {biometricEnabled && (
              <Pressable
                style={[styles.biometricBtn, { borderColor: border }]}
                onPress={handleBiometricLogin}
              >
                <IconSymbol name="touchid" size={20} color={primary} />
                <ThemedText style={{ color: primary, fontWeight: "600" }}>
                  Use Biometrics
                </ThemedText>
              </Pressable>
            )}
          </View>

          {/* OAuth Section */}
          <View style={styles.socialSection}>
            <ThemedText style={{ color: textMuted, marginBottom: 14 }}>
              Or continue with
            </ThemedText>
            <View style={styles.socialRow}>
              <Pressable
                style={[
                  styles.socialButton,
                  { borderColor: border, opacity: oauthLoading ? 0.6 : 1 },
                ]}
                onPress={() => promptAsync()}
                disabled={!request || oauthLoading}
              >
                {oauthLoading ? (
                  <ActivityIndicator size="small" color={primary} />
                ) : (
                  <>
                    <Image
                      source={require("@/assets/images/icons8-google-48.png")}
                      style={styles.socialIcon}
                    />
                    <ThemedText>Google</ThemedText>
                  </>
                )}
              </Pressable>

              {appleAvailable && (
                <Pressable
                  style={[styles.socialButton, { borderColor: border }]}
                  onPress={handleAppleSignIn}
                >
                  <IconSymbol name="apple.logo" size={18} color={primary} />
                  <ThemedText>Apple</ThemedText>
                </Pressable>
              )}
            </View>
          </View>

          {/* Footer */}
          <View style={styles.signupSection}>
            <ThemedText style={{ color: textMuted }}>
              Don’t have an account?
            </ThemedText>
            <Pressable onPress={() => router.push("/(auth)/signup")}>
              <ThemedText style={{ color: primary, fontWeight: "700" }}>
                Create account
              </ThemedText>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      <Toast />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingVertical: 40,
  },
  headerSection: {
    alignItems: "center",
    marginBottom: 40,
    gap: 4,
  },
  title: { fontSize: 28, fontWeight: "800" },
  card: { gap: 16 },
  errorText: { color: "#DC2626", fontSize: 13, fontWeight: "600" },
  forgotBtn: { alignSelf: "flex-end" },
  primaryButton: {
    height: 56,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
  },
  buttonText: { fontSize: 16, fontWeight: "700", color: "#000" },
  biometricBtn: {
    height: 56,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  socialSection: { marginTop: 40, alignItems: "center" },
  socialRow: { flexDirection: "row", gap: 12 },
  socialButton: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 20,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 120,
  },
  socialIcon: { width: 20, height: 20 },
  signupSection: {
    marginTop: 40,
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
  },
});
