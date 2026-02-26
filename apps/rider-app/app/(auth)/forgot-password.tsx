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
import { sendPasswordResetOtp } from "@/services/password-reset.service";
import Toast from "react-native-toast-message";
import { useRouter } from "expo-router";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  
  const router = useRouter();
  const primary = useThemeColor({}, "brandPrimary");
  const textOnPrimary = useThemeColor({}, "textOnPrimary");
  const muted = useThemeColor({}, "textMuted");

  function validateEmail() {
    if (!email) {
      setError("Email is required");
      return false;
    }
    
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError("Please enter a valid email address");
      return false;
    }
    
    return true;
  }

  async function handleSendOtp() {
    setError("");
    if (!validateEmail()) return;
    
    setLoading(true);
    try {
      await sendPasswordResetOtp(email);
      
      Toast.show({
        type: "success",
        text1: "OTP Sent",
        text2: "Check your email for the verification code",
      });
      
      // Navigate to verify screen with email
      // @ts-ignore - Dynamic route not yet in type system
      router.push({
        pathname: "/(auth)/verify-reset-password",
        params: { email },
      });
    } catch (e: any) {
      setError(e.message || "Failed to send OTP. Please try again.");
      Toast.show({
        type: "error",
        text1: "Error",
        text2: e.message || "Failed to send OTP",
      });
    } finally {
      setLoading(false);
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
                    Forgot Password
                  </ThemedText>
                  <ThemedText style={[styles.subtitle, { color: muted }]}>
                    Enter your email address and we'll send you a verification code to reset your password
                  </ThemedText>
                </View>

                {/* Email Field */}
                <View style={styles.field}>
                  <ThemedInput
                    placeholder="Email address"
                    autoCapitalize="none"
                    keyboardType="email-address"
                    value={email}
                    onChangeText={(text) => {
                      setEmail(text);
                      if (error) setError("");
                    }}
                  />
                </View>

                {error ? (
                  <ThemedText style={styles.inputError}>{error}</ThemedText>
                ) : null}

                {/* Send OTP Button */}
                <Pressable
                  style={[styles.sendButton, { backgroundColor: primary }]}
                  onPress={handleSendOtp}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator color={textOnPrimary} />
                  ) : (
                    <ThemedText
                      style={{ color: textOnPrimary }}
                      type="defaultSemiBold"
                    >
                      Send Verification Code
                    </ThemedText>
                  )}
                </Pressable>

                {/* Back to Login */}
                <View style={styles.backToLogin}>
                  <ThemedText>
                    Remember your password?{" "}
                    <ThemedText
                      type="link"
                      onPress={() => router.back()}
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
  sendButton: {
    height: 52,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  backToLogin: { alignItems: "center", marginTop: 24 },
  inputError: { marginTop: 4, color: "#EF4444", textAlign: "left" },
});
