import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useToast } from "@/components/ui/toast";
import { requestPasswordReset } from "@/services/auth.service";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

export default function ForgotPasswordEmailScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const router = useRouter();
  const showToast = useToast();

  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!EMAIL_REGEX.test(email.trim())) {
      setError("Enter a valid email address");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await requestPasswordReset(email.trim());
      showToast({
        variant: "success",
        title: "OTP sent",
        message: "Check your email for the 6-digit code.",
      });
      router.push({
        pathname: "/forgot-password/otp",
        params: { email: email.trim().toLowerCase() },
      });
    } catch (err: any) {
      setError(err?.message || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

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
            Back to sign in
          </ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Forgot password?
          </ThemedText>
          <ThemedText style={{ color: textMuted }}>
            Enter the email linked to your account and we'll send you a
            one-time code to reset your password.
          </ThemedText>
        </View>

        <View style={[styles.card, { borderColor: border }]}>
          <ThemedInput
            placeholder="Email address"
            keyboardType="email-address"
            autoCapitalize="none"
            value={email}
            editable={!loading}
            onChangeText={(value) => {
              setEmail(value);
              if (error) setError(null);
            }}
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
                Send OTP
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
