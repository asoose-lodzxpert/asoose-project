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
import Toast from "react-native-toast-message";

export default function LoginScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const textColor = useThemeColor({}, "textPrimary");

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

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const {
    request,
    response,
    promptAsync,
    isConfigured: googleConfigured,
  } = useGoogleSignIn();
  const [appleAvailable, setAppleAvailable] = useState(false);
  const [oauthLoading, setOauthLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);

  const handleBiometricLogin = async () => {
    setBiometricLoading(true);
    try {
      await biometricLogin();
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      // Only show error if it's not a user cancellation
      if (err?.message !== "User cancelled") {
        Toast.show({
          type: "error",
          text1: err?.message || "Biometric login failed",
        });
      }
    } finally {
      setBiometricLoading(false);
    }
  };

  // Check availability and trigger auto-prompt on mount
  useEffect(() => {
    (async () => {
      const enabled = await isBiometricEnabled();
      setBiometricEnabled(enabled);

      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);

      // Auto-trigger biometric prompt if enabled
      if (enabled) {
        handleBiometricLogin();
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
          title: "Enable Face/Touch ID",
          message: "Would you like to use Biometrics for your next sign-in?",
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
      setError(err.message || "Invalid credentials");
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
      Toast.show({ type: "error", text1: "Google login failed" });
    } finally {
      setOauthLoading(false);
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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerArea}>
            <ThemedText style={styles.title}>Sign In</ThemedText>
            <ThemedText style={[styles.subtitle, { color: textMuted }]}>
              Enter your details to access your account
            </ThemedText>
          </View>

          <View style={styles.formArea}>
            <View style={styles.inputGroup}>
              <ThemedText style={styles.label}>Email Address</ThemedText>
              <ThemedInput
                placeholder="hello@example.com"
                value={identifier}
                onChangeText={(v) => {
                  setIdentifier(v);
                  setError(null);
                }}
                autoCapitalize="none"
                autoComplete="email"
                keyboardType="email-address"
                editable={!loading}
              />
            </View>

            <View style={styles.inputGroup}>
              <View style={styles.labelRow}>
                <ThemedText style={styles.label}>Password</ThemedText>
                <Pressable
                  onPress={() =>
                    router.push(
                      "/(auth)/forgot-password/" as RelativePathString,
                    )
                  }
                >
                  <ThemedText style={[styles.forgotText, { color: primary }]}>
                    Forgot?
                  </ThemedText>
                </Pressable>
              </View>
              <ThemedInput
                placeholder="••••••••"
                value={password}
                onChangeText={(v) => {
                  setPassword(v);
                  setError(null);
                }}
                secureTextEntry={secure}
                editable={!loading}
                iconRight={
                  <Pressable onPress={() => setSecure(!secure)} hitSlop={12}>
                    <IconSymbol
                      name={secure ? "eye.slash" : "eye"}
                      size={20}
                      color={textMuted}
                    />
                  </Pressable>
                }
              />
            </View>

            {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

            <View style={styles.actionRow}>
              <Pressable
                style={[
                  styles.primaryButton,
                  { backgroundColor: primary, opacity: loading ? 0.8 : 1 },
                ]}
                onPress={handleLogin}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color={textOnPrimary} />
                ) : (
                  <ThemedText
                    style={[styles.buttonText, { color: textOnPrimary }]}
                  >
                    Sign In
                  </ThemedText>
                )}
              </Pressable>

              {biometricEnabled && (
                <Pressable
                  style={[
                    styles.biometricSideButton,
                    { borderColor: border, backgroundColor: surface },
                  ]}
                  onPress={handleBiometricLogin}
                  disabled={biometricLoading}
                >
                  {biometricLoading ? (
                    <ActivityIndicator color={primary} />
                  ) : (
                    <IconSymbol name="faceid" size={28} color={primary} />
                  )}
                </Pressable>
              )}
            </View>
          </View>

          <View style={styles.footerArea}>
            <View style={styles.dividerRow}>
              <View style={[styles.line, { backgroundColor: border }]} />
              <ThemedText style={[styles.dividerText, { color: textMuted }]}>
                OR SIGN IN WITH
              </ThemedText>
              <View style={[styles.line, { backgroundColor: border }]} />
            </View>

            <View style={styles.socialRow}>
              {googleConfigured && (
                <Pressable
                  style={[styles.socialCircle, { borderColor: border }]}
                  onPress={() => promptAsync()}
                  disabled={oauthLoading}
                >
                  <Image
                    source={require("@/assets/images/icons8-google-48.png")}
                    style={styles.socialIcon}
                  />
                </Pressable>
              )}
              {appleAvailable && (
                <Pressable
                  style={[styles.socialCircle, { borderColor: border }]}
                  onPress={authenticateWithApple}
                  disabled={oauthLoading}
                >
                  <IconSymbol name="apple.logo" size={22} color={textColor} />
                </Pressable>
              )}
            </View>

            <View style={styles.signupPrompt}>
              <ThemedText style={{ color: textMuted }}>
                New to the app?
              </ThemedText>
              <Pressable onPress={() => router.push("/(auth)/signup")}>
                <ThemedText style={{ color: primary, fontWeight: "700" }}>
                  {" "}
                  Create Account
                </ThemedText>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 28,
    paddingTop: Platform.OS === "ios" ? 80 : 50,
    paddingBottom: 40,
  },
  headerArea: {
    marginBottom: 48,
  },
  title: { fontSize: 36, fontWeight: "800", letterSpacing: -1 },
  subtitle: { fontSize: 16, marginTop: 8, lineHeight: 22 },

  formArea: {
    gap: 24,
  },
  inputGroup: {
    gap: 8,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    opacity: 0.7,
  },
  forgotText: {
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  actionRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 12,
    alignItems: "center",
  },
  primaryButton: {
    flex: 1,
    height: 60,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  biometricSideButton: {
    width: 60,
    height: 60,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: { fontSize: 17, fontWeight: "700" },

  footerArea: {
    marginTop: 48,
    gap: 32,
  },
  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  line: { flex: 1, height: 1, opacity: 0.5 },
  dividerText: { fontSize: 11, fontWeight: "800", letterSpacing: 1 },

  socialRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 20,
  },
  socialCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  socialIcon: { width: 24, height: 24 },
  signupPrompt: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
  },
});
