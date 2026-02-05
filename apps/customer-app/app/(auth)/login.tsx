import React, { useState } from "react";
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

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/context/AuthContext";

/* ---------------------------------- */
/* Screen */
/* ---------------------------------- */
export default function LoginScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const { login } = useAuth();
  const router = useRouter();

  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const biometricEnabled = true;

  /* ---------------------------------- */
  /* Simulated Login */
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
      router.replace({ pathname: "/(tabs)/home" });
    } catch (err: any) {
      setError(err.message || "Login failed");
    }
    setLoading(false);
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
            <Pressable style={[styles.socialButton, { borderColor: border }]}>
              <IconSymbol name="google.logo" size={18} color={primary} />
              <ThemedText>Google</ThemedText>
            </Pressable>

            <Pressable style={[styles.socialButton, { borderColor: border }]}>
              <IconSymbol name="apple.logo" size={18} color={primary} />
              <ThemedText>Apple</ThemedText>
            </Pressable>
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
