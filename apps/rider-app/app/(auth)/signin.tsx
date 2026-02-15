import React, { useState } from "react";
import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
  View,
} from "react-native";

import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useAuth } from "@/context/AuthContext";
import { useConfirm } from "@/hooks/use-confirm";
import { useThemeColor } from "@/hooks/use-theme-color";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";

export default function LoginScreen() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [loading, setLoading] = useState(false);
  const [biometricLoading, setBiometricLoading] = useState(false);
  const [error, setError] = useState("");

  const {
    login,
    biometricAvailable,
    biometricEnrolled,
    biometricLogin,
    enableBiometrics,
    isBiometricEnabled,
  } = useAuth();
  const { confirm, ConfirmModal } = useConfirm();
  const router = useRouter();

  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const muted = useThemeColor({}, "textMuted");

  /* ------------------ Logic ------------------ */

  function validateForm() {
    if (!identifier) {
      setError("Email or phone number is required.");
      return false;
    }
    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters.");
      return false;
    }
    return true;
  }

  async function handleLogin() {
    setError("");
    if (!validateForm()) return;
    setLoading(true);
    try {
      await login({ email: identifier, password });

      // After successful login, check if biometric should be offered
      const enabled = await isBiometricEnabled();
      if (biometricAvailable && !enabled) {
        const wantsBiometric = await confirm({
          title: "Enable Biometric Login?",
          message:
            "Would you like to enable biometric authentication for faster login in the future?",
          confirmText: "Yes",
          cancelText: "No",
          type: "info",
          icon: "touchid",
        });
        if (wantsBiometric) {
          try {
            setBiometricLoading(true);
            await enableBiometrics(identifier, password);
            Toast.show({
              type: "success",
              text1: "Biometric Enabled",
              text2: "You can now use biometric login.",
            });
          } catch (e: any) {
            Toast.show({
              type: "error",
              text1: "Biometric Setup Failed",
              text2: e.message || "Could not enable biometric login.",
            });
          } finally {
            setBiometricLoading(false);
          }
        }
      }

      router.replace("/(tabs)");
    } catch (e: any) {
      setError(e.message || "Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleBiometricLogin() {
    if (!biometricAvailable) {
      Toast.show({
        type: "error",
        text1: "Not Supported",
        text2: "Your device doesn't support biometric authentication.",
      });
      return;
    }
    if (!biometricEnrolled) {
      Toast.show({
        type: "error",
        text1: "Not Enrolled",
        text2:
          "Please set up biometric authentication in your device settings.",
      });
      return;
    }
    const enabled = await isBiometricEnabled();
    if (!enabled) {
      Toast.show({
        type: "info",
        text1: "Biometric Login Disabled",
        text2:
          "Please login with your credentials first and enable biometric login in settings.",
      });
      return;
    }
    setBiometricLoading(true);
    setError("");
    try {
      await biometricLogin();
      // Navigation is handled automatically by index.tsx based on auth state
    } catch (e: any) {
      setError(e.message || "Biometric authentication failed.");
    } finally {
      setBiometricLoading(false);
    }
  }

  /* ------------------ UI ------------------ */

  return (
    <ThemedView style={styles.container}>
      <ConfirmModal />
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          <KeyboardAvoidingView
            style={{ flex: 1 }}
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            keyboardVerticalOffset={Platform.OS === "ios" ? 40 : 0}
          >
            <ScrollView
              contentContainerStyle={{ flexGrow: 1 }}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.form}>
                <View style={styles.welcomeSection}>
                  <ThemedText type="title" style={styles.welcomeTitle}>
                    Welcome back
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: muted }]}>
                    Sign in to continue riding
                  </ThemedText>
                </View>

                <View style={styles.field}>
                  <ThemedInput
                    placeholder="Email or phone number"
                    autoCapitalize="none"
                    value={identifier}
                    onChangeText={(text) => {
                      setIdentifier(text);
                      if (error) setError("");
                    }}
                  />
                </View>

                <View style={styles.field}>
                  <ThemedInput
                    placeholder="Password"
                    secureTextEntry={secure}
                    value={password}
                    onChangeText={(text) => {
                      setPassword(text);
                      if (error) setError("");
                    }}
                    iconRight={
                      <Pressable onPress={() => setSecure(!secure)}>
                        <IconSymbol
                          size={24}
                          name={secure ? "eye.fill" : "eye.slash.fill"}
                          color={primary}
                        />
                      </Pressable>
                    }
                  />
                </View>

                {error ? (
                  <ThemedText style={styles.inputError}>{error}</ThemedText>
                ) : null}

                <View style={styles.actionsRow}>
                  <Pressable
                    style={[styles.loginButton, { backgroundColor: primary }]}
                    onPress={handleLogin}
                    disabled={loading || biometricLoading}
                  >
                    {loading ? (
                      <ActivityIndicator color={textOnPrimary} />
                    ) : (
                      <ThemedText
                        style={{ color: textOnPrimary }}
                        type="defaultSemiBold"
                      >
                        Login
                      </ThemedText>
                    )}
                  </Pressable>

                  <Pressable
                    style={[
                      styles.fingerprintButton,
                      { borderColor: primary },
                      biometricLoading && {
                        opacity: 0.5,
                      },
                    ]}
                    onPress={handleBiometricLogin}
                    disabled={biometricLoading}
                  >
                    {biometricLoading ? (
                      <ActivityIndicator color={primary} />
                    ) : (
                      <IconSymbol name="touchid" size={26} color={primary} />
                    )}
                  </Pressable>
                </View>

                <View style={styles.divider}>
                  <View style={styles.line} />
                  <ThemedText style={styles.orText}>OR</ThemedText>
                  <View style={styles.line} />
                </View>

                <View style={styles.signup}>
                  <ThemedText>
                    New partner?{" "}
                    <ThemedText
                      type="link"
                      onPress={() => router.push("/(auth)/signup")}
                    >
                      Sign up
                    </ThemedText>
                  </ThemedText>
                </View>
              </View>
            </ScrollView>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </ThemedView>
  );
}

/* ------------------ Styles ------------------ */

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 24,
  },
  form: {
    flex: 1,
    justifyContent: "center",
    gap: 16,
  },
  welcomeSection: {
    alignItems: "center",
    marginBottom: 16,
  },
  welcomeTitle: {
    textAlign: "center",
  },
  subtitle: {
    marginTop: 8,
    fontSize: 14,
    textAlign: "center",
  },
  field: {
    marginTop: 12,
  },
  actionsRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
  },
  loginButton: {
    flex: 1,
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  fingerprintButton: {
    width: 52,
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
  },
  divider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 24,
  },
  line: {
    flex: 1,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  orText: {
    marginHorizontal: 12,
    fontSize: 12,
    opacity: 0.6,
  },
  signup: {
    alignItems: "center",
    marginBottom: 24,
  },
  inputError: {
    marginTop: 4,
    color: "#EF4444",
    textAlign: "left",
  },
});
