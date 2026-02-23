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
import { useRouter } from "expo-router";
import Toast from "react-native-toast-message";

// Services & Context
import {
  configureGoogleSignIn,
  signInWithGoogle,
  authenticateWithApple,
  isAppleSignInAvailable,
} from "@/services/oauth.service";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/components/ui/ConfirmDialogProvider";
import { useThemeColor } from "@/hooks/use-theme-color";

// UI Components
import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";

export default function LoginScreen() {
  const router = useRouter();
  const showConfirm = useConfirm();
  const {
    login,
    biometricLogin,
    biometricAvailable,
    biometricEnrolled,
    enableBiometrics,
    isBiometricEnabled,
  } = useAuth();

  // Theme Colors
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const cardBg = useThemeColor({}, "surfaceCard"); // Or similar secondary surface color

  // State
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [biometricEnabled, setBiometricEnabled] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Entrance Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;

  useEffect(() => {
    configureGoogleSignIn();

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.back(1.5)),
        useNativeDriver: true,
      }),
    ]).start();

    (async () => {
      const [isBioEnabled, isAppleAvail] = await Promise.all([
        isBiometricEnabled(),
        isAppleSignInAvailable(),
      ]);
      setBiometricEnabled(isBioEnabled);
      setAppleAvailable(isAppleAvail);

      if (isBioEnabled) {
        setTimeout(handleBiometricLogin, 600);
      }
    })();
  }, []);

  /* =========================
      Function Handlers
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

      // Post-login check for biometric setup
      if (biometricAvailable && biometricEnrolled && !biometricEnabled) {
        const confirmed = await showConfirm({
          title: "Fast Login",
          message: "Would you like to enable biometrics for your next visit?",
          confirmLabel: "Yes, enable",
          cancelLabel: "Maybe later",
        });
        if (confirmed) {
          await enableBiometrics(identifier, password);
          setBiometricEnabled(true);
        }
      }
      router.replace("/(tabs)/home");
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
      router.replace("/(tabs)/home");
    } catch (err: any) {
      if (err?.message !== "User cancelled") {
        Toast.show({
          type: "error",
          text1: err?.message || "Biometric failed",
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
      router.replace("/(tabs)/home");
    } catch (err: any) {
      if (err?.message !== "Google Sign-In was cancelled") {
        Toast.show({ type: "error", text1: "Google login failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    setLoading(true);
    try {
      await authenticateWithApple();
      router.replace("/(tabs)/home");
    } catch (err: any) {
      if (err?.message !== "Apple Sign-In was cancelled") {
        Toast.show({ type: "error", text1: "Apple login failed" });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      {/* Better Loading Overlay (No Expo Blur) */}
      {loading && (
        <View style={styles.loadingOverlay}>
          <View
            style={[styles.loadingCard, { backgroundColor: cardBg || surface }]}
          >
            <ActivityIndicator size="large" color={primary} />
            <ThemedText style={styles.loadingText}>Please wait...</ThemedText>
          </View>
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
            style={[
              styles.centeredWrapper,
              { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
            ]}
          >
            {/* Header Section */}
            <View style={styles.header}>
              <View
                style={[styles.brandIcon, { backgroundColor: primary + "10" }]}
              >
                <IconSymbol
                  name="person.crop.circle.fill"
                  size={48}
                  color={primary}
                />
              </View>
              <ThemedText style={styles.title}>Sign In</ThemedText>
              <ThemedText style={[styles.subtitle, { color: textMuted }]}>
                Welcome back! Please enter your details.
              </ThemedText>
            </View>

            {/* Form Section */}
            <View style={styles.form}>
              <ThemedInput
                placeholder="Email Address"
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
                  <Pressable onPress={() => setSecure(!secure)} hitSlop={10}>
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

              <View style={styles.buttonRow}>
                <Pressable
                  style={[styles.loginButton, { backgroundColor: primary }]}
                  onPress={handleLogin}
                  disabled={loading}
                >
                  <ThemedText
                    style={[styles.buttonText, { color: textOnPrimary }]}
                  >
                    Sign In
                  </ThemedText>
                </Pressable>

                {biometricEnabled && (
                  <Pressable
                    style={[styles.bioIconButton, { borderColor: border }]}
                    onPress={handleBiometricLogin}
                  >
                    <IconSymbol name="faceid" size={28} color={primary} />
                  </Pressable>
                )}
              </View>

              {/* Centered Divider */}
              <View style={styles.dividerContainer}>
                <View style={[styles.line, { backgroundColor: border }]} />
                <ThemedText style={[styles.dividerText, { color: textMuted }]}>
                  OR
                </ThemedText>
                <View style={[styles.line, { backgroundColor: border }]} />
              </View>

              {/* Rounded Social Icons */}
              <View style={styles.socialContainer}>
                <Pressable
                  style={[styles.socialCircle, { borderColor: border }]}
                  onPress={handleGoogleSignIn}
                >
                  <Image
                    source={require("@/assets/images/icons8-google-48.png")}
                    style={styles.logoImage}
                  />
                </Pressable>

                {appleAvailable && (
                  <Pressable
                    style={[styles.socialCircle, { borderColor: border }]}
                    onPress={handleAppleSignIn}
                  >
                    <Image
                      source={require("@/assets/images/icons8-google-48.png")}
                      style={styles.logoImage}
                    />
                  </Pressable>
                )}
              </View>
            </View>

            {/* Centered Footer */}
            <Pressable
              style={styles.footer}
              onPress={() => router.push("/signup")}
            >
              <ThemedText style={{ color: textMuted }}>
                New here?{" "}
                <ThemedText style={{ color: primary, fontWeight: "700" }}>
                  Create an account
                </ThemedText>
              </ThemedText>
            </Pressable>
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
    justifyContent: "center", // Vertical center
    padding: 32,
  },
  centeredWrapper: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  header: {
    alignItems: "center",
    marginBottom: 32,
  },
  brandIcon: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: {
    fontSize: 30,
    fontWeight: "800",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    marginTop: 6,
    textAlign: "center",
  },
  form: {
    gap: 16,
  },
  buttonRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 8,
  },
  loginButton: {
    flex: 1,
    height: 58,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  bioIconButton: {
    width: 58,
    height: 58,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonText: {
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: "#F43F5E",
    textAlign: "center",
    fontSize: 14,
    fontWeight: "500",
  },
  dividerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 12,
  },
  line: {
    flex: 1,
    height: 1.5,
    opacity: 0.5,
  },
  dividerText: {
    marginHorizontal: 16,
    fontSize: 12,
    fontWeight: "800",
    opacity: 0.6,
  },
  socialContainer: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
  },
  socialCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  logoImage: {
    width: 28,
    height: 28,
    resizeMode: "contain",
  },
  footer: {
    marginTop: 32,
    alignItems: "center",
  },
  // Loading Components
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.5)",
    zIndex: 100,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingCard: {
    padding: 32,
    borderRadius: 24,
    alignItems: "center",
    width: 180,
  },
  loadingText: {
    marginTop: 16,
    fontWeight: "700",
    fontSize: 14,
  },
});
