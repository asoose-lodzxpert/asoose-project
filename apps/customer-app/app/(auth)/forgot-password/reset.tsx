import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useToast } from "@/components/ui/toast";
import { resetPasswordWithOtp } from "@/services/auth.service";

export default function ForgotPasswordResetScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const router = useRouter();
  const showToast = useToast();
  const params = useLocalSearchParams<{ email?: string; token?: string }>();

  const email = typeof params.email === "string" ? params.email.trim() : "";
  const token = typeof params.token === "string" ? params.token.trim() : "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);

  useEffect(() => {
    if (!email || !token) {
      router.replace("/login");
    }
  }, [email, token, router]);

  const handleSubmit = async () => {
    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await resetPasswordWithOtp({ email, token, newPassword: password });
      showToast({
        variant: "success",
        title: "Password updated",
        message: "You can now sign in with your new password.",
      });
      router.replace("/login");
    } catch (err: any) {
      const message = err?.message || "Failed to reset password";
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  const helperText = useMemo(() => {
    if (!email) return "";
    return `Updating password for ${email}`;
  }, [email]);

  return (
    <ThemedView style={[styles.container, { backgroundColor: surface }]}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable
          style={styles.backButton}
          disabled={loading}
          onPress={() => router.back()}
        >
          <IconSymbol name="chevron.left" size={18} color={primary} />
          <ThemedText style={{ color: primary, fontWeight: "600" }}>
            Back
          </ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Choose a new password
          </ThemedText>
          <ThemedText style={{ color: textMuted }}>{helperText}</ThemedText>
        </View>

        <View style={[styles.card, { borderColor: border }]}>
          <ThemedInput
            placeholder="New password"
            secureTextEntry={secure}
            value={password}
            onChangeText={(value) => {
              setPassword(value);
              if (error) setError(null);
            }}
            iconRight={
              <Pressable onPress={() => setSecure((s) => !s)}>
                <IconSymbol
                  name={secure ? "eye.slash.fill" : "eye.fill"}
                  size={18}
                  color={textMuted}
                />
              </Pressable>
            }
            editable={!loading}
          />

          <ThemedInput
            placeholder="Confirm password"
            secureTextEntry={secureConfirm}
            value={confirmPassword}
            onChangeText={(value) => {
              setConfirmPassword(value);
              if (error) setError(null);
            }}
            iconRight={
              <Pressable onPress={() => setSecureConfirm((s) => !s)}>
                <IconSymbol
                  name={secureConfirm ? "eye.slash.fill" : "eye.fill"}
                  size={18}
                  color={textMuted}
                />
              </Pressable>
            }
            editable={!loading}
          />

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <Pressable
            style={[
              styles.primaryButton,
              { backgroundColor: primary, opacity: loading ? 0.7 : 1 },
            ]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#000" />
            ) : (
              <ThemedText style={styles.primaryButtonText}>
                Update password
              </ThemedText>
            )}
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 32,
  },
  backButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  header: {
    gap: 10,
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
  },
  card: {
    gap: 16,
    borderWidth: 1,
    borderRadius: 16,
    padding: 20,
  },
  primaryButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryButtonText: {
    color: "#000",
    fontSize: 16,
    fontWeight: "700",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
});
