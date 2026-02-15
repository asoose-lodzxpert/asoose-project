import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useLocalSearchParams, useRouter, type Href } from "expo-router";

import { ThemedView } from "@/components/themed-view";
import { ThemedText } from "@/components/themed-text";
import { ThemedInput } from "@/components/ThemedInput";
import { IconSymbol } from "@/components/ui/icon-symbol";
import { useThemeColor } from "@/hooks/use-theme-color";
import Toast from "react-native-toast-message";
import { requestPasswordReset } from "@/services/auth.service";

const OTP_LENGTH = 6;

export default function ForgotPasswordOtpScreen() {
  const primary = useThemeColor({}, "brandPrimary");
  const surface = useThemeColor({}, "surfaceBackground");
  const textMuted = useThemeColor({}, "textMuted");
  const border = useThemeColor({}, "borderDefault");

  const router = useRouter();

  const params = useLocalSearchParams<{ email?: string }>();
  const emailParam = typeof params.email === "string" ? params.email : "";
  const email = emailParam.trim();

  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (!email) {
      router.replace("/(auth)/forgot-password/reset");
    }
  }, [email, router]);

  const maskedEmail = useMemo(() => {
    if (!email) return "your email";
    const [user, domain] = email.split("@");
    if (!domain) return email;
    const visible = user.slice(0, 2);
    return `${visible}${"*".repeat(Math.max(user.length - 2, 2))}@${domain}`;
  }, [email]);

  const handleContinue = () => {
    if (otp.trim().length !== OTP_LENGTH) {
      setError(`Enter the ${OTP_LENGTH}-digit code`);
      return;
    }
    router.push({
      pathname: "/(auth)/forgot-password/reset",
      params: { email, token: otp.trim() },
    });
  };

  const handleResend = async () => {
    if (!email) return;
    setResending(true);
    try {
      await requestPasswordReset(email);
      showToast({
        variant: "success",
        message: "A new code has been sent to your email.",
      });
    } catch (err: any) {
      showToast({
        variant: "error",
        message: err?.message || "Unable to resend code",
      });
    } finally {
      setResending(false);
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
          onPress={() => router.back()}
          disabled={resending}
        >
          <IconSymbol name="chevron.left" size={18} color={primary} />
          <ThemedText style={{ color: primary, fontWeight: "600" }}>
            Back
          </ThemedText>
        </Pressable>

        <View style={styles.header}>
          <ThemedText type="title" style={styles.title}>
            Enter the code
          </ThemedText>
          <ThemedText style={{ color: textMuted }}>
            We sent a {OTP_LENGTH}-digit code to {maskedEmail}.
          </ThemedText>
        </View>

        <View style={[styles.card, { borderColor: border }]}>
          <ThemedInput
            placeholder={`${OTP_LENGTH}-digit code`}
            keyboardType="number-pad"
            value={otp}
            maxLength={OTP_LENGTH}
            onChangeText={(value) => {
              setOtp(value.replace(/[^0-9]/g, ""));
              if (error) setError(null);
            }}
          />

          {error && <ThemedText style={styles.errorText}>{error}</ThemedText>}

          <Pressable
            style={[styles.primaryButton, { backgroundColor: primary }]}
            disabled={otp.length !== OTP_LENGTH}
            onPress={handleContinue}
          >
            <ThemedText style={styles.primaryButtonText}>Continue</ThemedText>
          </Pressable>

          <Pressable
            style={styles.resendButton}
            onPress={handleResend}
            disabled={resending}
          >
            {resending ? (
              <ActivityIndicator color={primary} />
            ) : (
              <ThemedText style={{ color: primary, fontWeight: "600" }}>
                Resend code
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
  resendButton: {
    alignItems: "center",
  },
  errorText: {
    color: "#DC2626",
    fontSize: 13,
    fontWeight: "600",
  },
});
