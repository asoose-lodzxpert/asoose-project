import React, { useState, useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Image,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  ScrollView,
  Animated,
  Easing,
} from "react-native";
import { RelativePathString, useRouter } from "expo-router";
import {
  configureGoogleSignIn,
  signInWithGoogle,
  authenticateWithApple,
  isAppleSignInAvailable,
} from "@/services/oauth.service";

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

  const [appleAvailable, setAppleAvailable] = useState(false);

  /* =========================
     Animation Setup
  ========================== */

  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 500,
        easing: Easing.out(Easing.ease),
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  useEffect(() => {
    if (loading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 600,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [loading]);

  /* =========================
     Biometric Auto Prompt
  ========================== */

  useEffect(() => {
    let mounted = true;

    (async () => {
      const enabled = await isBiometricEnabled();
      const available = await isAppleSignInAvailable();

      if (!mounted) return;

      setBiometricEnabled(enabled);
      setAppleAvailable(available);

      if (enabled) {
        setTimeout(() => {
          handleBiometricLogin();
        }, 500);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  /* =========================
     Handlers
  ========================== */

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
          title: "Enable Biometrics",
          message: "Use fingerprint for faster sign in next time?",
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

  const handleBiometricLogin = async () => {
    setLoading(true);
    try {
      await biometricLogin();
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      if (err?.message !== "User cancelled") {
        Toast.show({
          type: "error",
          text1: err?.message || "Biometric login failed",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      await signInWithGoogle();
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      if (err?.message !== "Google Sign-In was cancelled") {
        Toast.show({
          type: "error",
          text1: err?.message || "Google login failed",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await authenticateWithApple();
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      if (err?.message !== "Apple Sign-In was cancelled") {
        Toast.show({
          type: "error",
          text1: err?.message || "Apple login failed",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Pulsing Overlay */}
      {loading && (
        <View style={styles.overlay}>
          <Animated.View
            style={[
              styles.overlayCard,
              {
                transform: [{ scale: pulseAnim }],
                backgroundColor: primary,
              },
            ]}
          >
            <ActivityIndicator size="large" color="#fff" />
            <ThemedText style={{ color: "#fff", marginTop: 12 }}>
              Signing you in...
            </ThemedText>
          </Animated.View>
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Animated.View
            style={{
              opacity: fadeAnim,
              transform: [{ translateY: translateAnim }],
            }}
          >
            <View style={styles.headerArea}>
              <ThemedText style={styles.title}>Sign In</ThemedText>
              <ThemedText style={[styles.subtitle, { color: textMuted }]}>
                Access your account securely
              </ThemedText>
            </View>

            <View style={styles.formArea}>
              <ThemedInput
                placeholder="Email"
                value={identifier}
                onChangeText={setIdentifier}
                autoCapitalize="none"
              />

              <ThemedInput
                placeholder="Password"
                value={password}
                onChangeText={setPassword}
                secureTextEntry={secure}
                iconRight={
                  <Pressable onPress={() => setSecure(!secure)}>
                    <IconSymbol
                      name={secure ? "eye.slash" : "eye"}
                      size={20}
                      color={textMuted}
                    />
                  </Pressable>
                }
              />

              {error && (
                <ThemedText style={styles.errorText}>{error}</ThemedText>
              )}

              <View style={styles.actionRow}>
                <Pressable
                  style={[styles.primaryButton, { backgroundColor: primary }]}
                  onPress={handleLogin}
                >
                  <ThemedText
                    style={[styles.buttonText, { color: textOnPrimary }]}
                  >
                    Sign In
                  </ThemedText>
                </Pressable>

                {biometricEnabled && (
                  <Pressable
                    style={[
                      styles.biometricButton,
                      { backgroundColor: primary },
                    ]}
                    onPress={handleBiometricLogin}
                  >
                    <IconSymbol
                      name="fingerprint"
                      size={22}
                      color={textOnPrimary}
                    />
                  </Pressable>
                )}
              </View>

              {/* ── Social divider ── */}
              <View style={styles.dividerRow}>
                <View
                  style={[styles.dividerLine, { backgroundColor: border }]}
                />
                <ThemedText style={[styles.dividerText, { color: textMuted }]}>
                  or continue with
                </ThemedText>
                <View
                  style={[styles.dividerLine, { backgroundColor: border }]}
                />
              </View>

              {/* ── Social buttons ── */}
              <View style={styles.socialRow}>
                <Pressable
                  style={[styles.socialButton, { borderColor: border }]}
                  onPress={handleGoogleSignIn}
                  disabled={loading}
                >
                  <IconSymbol name="google.logo" size={20} color={textColor} />
                  <ThemedText
                    style={[styles.socialButtonText, { color: textColor }]}
                  >
                    Google
                  </ThemedText>
                </Pressable>

                {appleAvailable && (
                  <Pressable
                    style={[styles.socialButton, { borderColor: border }]}
                    onPress={handleAppleSignIn}
                    disabled={loading}
                  >
                    <IconSymbol name="apple.logo" size={20} color={textColor} />
                    <ThemedText
                      style={[styles.socialButtonText, { color: textColor }]}
                    >
                      Apple
                    </ThemedText>
                  </Pressable>
                )}
              </View>
            </View>
          </Animated.View>
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
    paddingTop: Platform.OS === "ios" ? 70 : 50,
    paddingBottom: 40,
  },

  headerArea: {
    marginBottom: 40,
  },

  title: {
    fontSize: 34,
    fontWeight: "800",
  },

  subtitle: {
    fontSize: 15,
    marginTop: 8,
  },

  formArea: {
    gap: 18,
  },

  actionRow: {
    flexDirection: "row",
    marginTop: 10,
  },

  primaryButton: {
    flex: 1,
    height: 56,
    borderTopLeftRadius: 16,
    borderBottomLeftRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  biometricButton: {
    width: 64,
    height: 56,
    borderTopRightRadius: 16,
    borderBottomRightRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },

  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },

  errorText: {
    color: "#DC2626",
    fontSize: 14,
    textAlign: "center",
  },

  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },

  overlayCard: {
    paddingHorizontal: 32,
    paddingVertical: 28,
    borderRadius: 20,
    alignItems: "center",
  },

  dividerRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 4,
  },

  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
  },

  dividerText: {
    marginHorizontal: 12,
    fontSize: 13,
  },

  socialRow: {
    flexDirection: "row",
    gap: 12,
  },

  socialButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 50,
    borderRadius: 14,
    borderWidth: 1,
  },

  socialButtonText: {
    fontSize: 15,
    fontWeight: "600",
  },
});
