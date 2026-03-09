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
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  resetPassword,
  sendPasswordResetOtp,
} from "@/services/password-reset.service";
import Toast from "react-native-toast-message";
import { useRouter, useLocalSearchParams } from "expo-router";

export default function VerifyResetPasswordScreen() {
  const params = useLocalSearchParams();
  const email = params.email as string;

  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [secure, setSecure] = useState(true);
  const [secureConfirm, setSecureConfirm] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const muted = useThemeColor({}, "textMuted");

  function validateForm() {
    if (!otp || otp.length !== 6) {
      setError("Please enter the 6-digit verification code");
      return false;
    }

    if (!newPassword || newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return false;
    }

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match");
      return false;
    }

    return true;
  }

  async function handleResetPassword() {
    setError("");
    if (!validateForm()) return;

    setLoading(true);
    try {
      await resetPassword(email, otp, newPassword);

      Toast.show({
        type: "success",
        text1: "Password Reset Successful",
        text2: "You can now sign in with your new password",
      });

      // Navigate back to sign in
      router.replace("/(auth)/signin");
    } catch (e: any) {
      setError(e.message || "Failed to reset password. Please try again.");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e.message || "Failed to reset password",
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleResendOtp() {
    setResendLoading(true);
    try {
      await sendPasswordResetOtp(email);

      Toast.show({
        type: "success",
        text1: "OTP Resent",
        text2: "Check your email for the new verification code",
      });
    } catch (e: any) {
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e.message || "Failed to resend OTP",
      });
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <ThemedView style={styles.container}>
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
                {/* Header */}
                <View style={styles.header}>
                  <Pressable
                    onPress={() => router.back()}
                    style={styles.backButton}
                  >
                    <IconSymbol name="chevron.left" size={24} color={primary} />
                  </Pressable>
                </View>

                {/* Title Section */}
                <View style={styles.titleSection}>
                  <ThemedText type="title" style={styles.title}>
                    Reset Password
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: muted }]}>
                    Enter the verification code sent to {email} and your new
                    password
                  </ThemedText>
                </View>

                {/* OTP Field */}
                <View style={styles.field}>
                  <ThemedInput
                    placeholder="Verification Code (6 digits)"
                    keyboardType="number-pad"
                    maxLength={6}
                    value={otp}
                    onChangeText={(text) => {
                      setOtp(text);
                      if (error) setError("");
                    }}
                  />
                </View>

                {/* New Password Field */}
                <View style={styles.field}>
                  <ThemedInput
                    placeholder="New Password"
                    secureTextEntry={secure}
                    value={newPassword}
                    onChangeText={(text) => {
                      setNewPassword(text);
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

                {/* Confirm Password Field */}
                <View style={styles.field}>
                  <ThemedInput
                    placeholder="Confirm New Password"
                    secureTextEntry={secureConfirm}
                    value={confirmPassword}
                    onChangeText={(text) => {
                      setConfirmPassword(text);
                      if (error) setError("");
                    }}
                    iconRight={
                      <Pressable
                        onPress={() => setSecureConfirm(!secureConfirm)}
                      >
                        <IconSymbol
                          size={24}
                          name={secureConfirm ? "eye.fill" : "eye.slash.fill"}
                          color={primary}
                        />
                      </Pressable>
                    }
                  />
                </View>

                {error ? (
                  <ThemedText style={styles.inputError}>{error}</ThemedText>
                ) : null}

                {/* Reset Password Button */}
                <Pressable
                  style={[styles.resetButton, { backgroundColor: primary }]}
                  onPress={handleResetPassword}
                  disabled={loading || resendLoading}
                >
                  {loading ? (
                    <ActivityIndicator color={textOnPrimary} />
                  ) : (
                    <ThemedText
                      style={{ color: textOnPrimary }}
                      type="defaultSemiBold"
                    >
                      Reset Password
                    </ThemedText>
                  )}
                </Pressable>

                {/* Resend OTP */}
                <View style={styles.resendSection}>
                  <ThemedText style={{ color: muted }}>
                    Didn&apos;t receive the code?{" "}
                  </ThemedText>
                  <Pressable onPress={handleResendOtp} disabled={resendLoading}>
                    <ThemedText
                      type="link"
                      style={{ opacity: resendLoading ? 0.5 : 1 }}
                    >
                      {resendLoading ? "Sending..." : "Resend"}
                    </ThemedText>
                  </Pressable>
                </View>

                {/* Back to Login */}
                <View style={styles.backToLogin}>
                  <ThemedText>
                    Remember your password?{" "}
                    <ThemedText
                      type="link"
                      onPress={() => router.replace("/(auth)/signin")}
                    >
                      Sign in
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

const styles = StyleSheet.create({
  container: { flex: 1, paddingHorizontal: 24 },
  form: { flex: 1, paddingTop: 20, gap: 16 },
  header: { marginBottom: 16 },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  titleSection: { marginBottom: 24 },
  title: { marginBottom: 8 },
  subtitle: { fontSize: 14, lineHeight: 20 },
  field: { marginTop: 12 },
  resetButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  resendSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  backToLogin: { alignItems: "center", marginTop: 24 },
  inputError: { marginTop: 4, color: "#EF4444", textAlign: "left" },
});
